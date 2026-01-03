/**
 * Helius RPC Swap Ingester
 * Uses Solana WebSocket subscriptions to detect swaps in real-time.
 * THIS IS THE ONLY INGESTION SOURCE - NO FALLBACKS.
 */

const { Connection, PublicKey } = require('@solana/web3.js');

// Config from environment
const RPC_HTTP_URL = process.env.RPC_HTTP_URL;
const RPC_WS_URL = process.env.RPC_WS_URL;
const COMMITMENT = process.env.COMMITMENT || 'confirmed';
const INGEST_DEBUG = process.env.INGEST_DEBUG === 'true';
const MAX_SEEN_SIGNATURES = 5000;
const HEARTBEAT_INTERVAL_MS = 60000; // 60 seconds

const WSOL_MINT = 'So11111111111111111111111111111111111111112';

/**
 * Classify a transaction as BUY, SELL, or null
 * Uses ONLY meme token balance deltas (not native SOL)
 */
function classifySwap(tx, poolAddress) {
    if (!tx || !tx.meta || tx.meta.err) {
        return null;
    }

    const { meta } = tx;

    if (!meta.preTokenBalances || !meta.postTokenBalances) {
        return null;
    }

    // Find all token balances related to the pool
    const poolPreBalances = meta.preTokenBalances.filter(b =>
        b.owner === poolAddress
    );
    const poolPostBalances = meta.postTokenBalances.filter(b =>
        b.owner === poolAddress
    );

    // Identify the meme token mint (the one that's NOT WSOL)
    let memeMint = null;
    let memePreBalance = null;
    let memePostBalance = null;

    for (const preBalance of poolPreBalances) {
        const mint = preBalance.mint;
        if (mint !== WSOL_MINT) {
            memeMint = mint;
            memePreBalance = preBalance;
            break;
        }
    }

    if (!memeMint) {
        // Try to find in post balances
        for (const postBalance of poolPostBalances) {
            const mint = postBalance.mint;
            if (mint !== WSOL_MINT) {
                memeMint = mint;
                memePostBalance = postBalance;
                break;
            }
        }
    } else {
        // Find corresponding post balance
        memePostBalance = poolPostBalances.find(b => b.mint === memeMint);
    }

    if (!memeMint) {
        if (INGEST_DEBUG) {
            console.log('[HeliusIngest] No meme token found');
        }
        return null;
    }

    // Compute meme token delta using BigInt-safe string math
    const preAmount = BigInt(memePreBalance?.uiTokenAmount?.amount || '0');
    const postAmount = BigInt(memePostBalance?.uiTokenAmount?.amount || '0');
    const memeDelta = postAmount - preAmount;

    if (INGEST_DEBUG) {
        console.log(`[HeliusIngest] Meme mint: ${memeMint}`);
        console.log(`[HeliusIngest] Meme delta: ${memeDelta.toString()}`);
    }

    // Classification rules:
    // BUY  => memeDelta < 0 (pool lost meme tokens)
    // SELL => memeDelta > 0 (pool gained meme tokens)

    if (memeDelta < 0n) {
        return 'buy';
    } else if (memeDelta > 0n) {
        return 'sell';
    }

    return null;
}

/**
 * Start the Helius swap ingester
 */
function startHeliusIngester(poolAddress, onBuy, onSell) {
    console.log('[HeliusIngest] Starting...');
    console.log(`[HeliusIngest] Pool: ${poolAddress}`);
    console.log(`[HeliusIngest] Commitment: ${COMMITMENT}`);
    console.log(`[HeliusIngest] Debug: ${INGEST_DEBUG}`);

    const seenSignatures = new Set();
    let subscriptionId = null;
    let lastActivityTime = Date.now();
    let heartbeatTimer = null;
    let buyCount = 0;
    let sellCount = 0;

    // Create connection with WebSocket endpoint
    const connection = new Connection(RPC_HTTP_URL, {
        commitment: COMMITMENT,
        wsEndpoint: RPC_WS_URL
    });

    const poolPubkey = new PublicKey(poolAddress);

    async function processSignature(signature) {
        if (seenSignatures.has(signature)) {
            return;
        }

        seenSignatures.add(signature);
        lastActivityTime = Date.now();

        // Cap set size
        if (seenSignatures.size > MAX_SEEN_SIGNATURES) {
            const first = seenSignatures.values().next().value;
            seenSignatures.delete(first);
        }

        if (INGEST_DEBUG) {
            console.log(`[HeliusIngest] Processing: ${signature.slice(0, 20)}...`);
        }

        try {
            const tx = await connection.getParsedTransaction(signature, {
                maxSupportedTransactionVersion: 0,
                commitment: COMMITMENT
            });

            if (!tx) {
                if (INGEST_DEBUG) {
                    console.log(`[HeliusIngest] No tx data for ${signature.slice(0, 20)}...`);
                }
                return;
            }

            const classification = classifySwap(tx, poolAddress);

            if (classification === 'buy') {
                buyCount++;
                console.log(`[HeliusIngest] BUY ${signature}`);
                onBuy();
            } else if (classification === 'sell') {
                sellCount++;
                console.log(`[HeliusIngest] SELL ${signature}`);
                onSell();
            } else if (INGEST_DEBUG) {
                console.log(`[HeliusIngest] IGNORED ${signature.slice(0, 20)}...`);
            }

        } catch (err) {
            console.error(`[HeliusIngest] Error: ${err.message}`);
        }
    }

    // Subscribe to logs
    console.log('[HeliusIngest] Subscribing to logs...');

    subscriptionId = connection.onLogs(
        poolPubkey,
        (logs, context) => {
            if (logs.err) {
                if (INGEST_DEBUG) {
                    console.log(`[HeliusIngest] Log error: ${JSON.stringify(logs.err)}`);
                }
                return;
            }

            const signature = logs.signature;
            if (INGEST_DEBUG) {
                console.log(`[HeliusIngest] Log received: ${signature.slice(0, 20)}...`);
            }

            // Delay slightly to ensure tx is available
            setTimeout(() => processSignature(signature), 500);
        },
        COMMITMENT
    );

    console.log(`[HeliusIngest] Subscribed to logs (ID: ${subscriptionId})`);

    // Heartbeat timer
    heartbeatTimer = setInterval(() => {
        const elapsed = Date.now() - lastActivityTime;
        if (elapsed > HEARTBEAT_INTERVAL_MS) {
            console.log('[HeliusIngest] Waiting for transactions...');
        }
    }, HEARTBEAT_INTERVAL_MS);

    // Return cleanup function
    return function cleanup() {
        console.log(`[HeliusIngest] Stopping. Total: ${buyCount} buys, ${sellCount} sells`);
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
        }
        if (subscriptionId !== null) {
            try {
                connection.removeOnLogsListener(subscriptionId);
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    };
}

module.exports = { startHeliusIngester };
