/**
 * Solana RPC Capture Script
 * Runs the ingester for 20 seconds and prints diagnostic results.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ENV_PATH = path.join(__dirname, '..', '.env');
const CAPTURE_DURATION_MS = 20000;

const REQUIRED_ENV = {
    RPC_URL: 'https://api.mainnet-beta.solana.com',
    POOL_ADDRESS: 'DM7dfXxt2jRZxpfqwGxcbdeYDp3DdC43QbMCNLSww3AP',
    POLL_MS: '2000',
    PORT: '8080'
};

console.log('========================================');
console.log('  Solana RPC Capture & Diagnose Tool');
console.log('========================================\n');

// Step 1: Create/update .env file
console.log('[1/4] Configuring .env file...');

let existingEnv = {};
if (fs.existsSync(ENV_PATH)) {
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    content.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
            existingEnv[match[1].trim()] = match[2].trim();
        }
    });
}

// Merge with required values
const finalEnv = { ...existingEnv, ...REQUIRED_ENV };

// Write .env
const envContent = Object.entries(finalEnv)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n';
fs.writeFileSync(ENV_PATH, envContent);
console.log(`   ✓ .env updated at: ${ENV_PATH}`);
console.log(`   ✓ POOL_ADDRESS: ${REQUIRED_ENV.POOL_ADDRESS}`);
console.log(`   ✓ RPC_URL: ${REQUIRED_ENV.RPC_URL}`);

// Step 2: Set up environment
console.log('\n[2/4] Setting up environment...');
process.env.RPC_URL = REQUIRED_ENV.RPC_URL;
process.env.POOL_ADDRESS = REQUIRED_ENV.POOL_ADDRESS;
process.env.POLL_MS = REQUIRED_ENV.POLL_MS;

// Import ingester
const { startSolanaIngester, getSignaturesForAddress, getTransaction, classifySwap } = require('../solanaIngest');

// Step 3: Run capture
console.log('\n[3/4] Starting capture (20 seconds)...');
console.log('   ┌─────────────────────────────────────────────────┐');
console.log('   │  Monitoring pool for swap transactions...      │');
console.log('   │  Perform BUY/SELL on pump.fun to generate txs  │');
console.log('   └─────────────────────────────────────────────────┘\n');

const results = {
    buyCount: 0,
    sellCount: 0,
    unknownCount: 0,
    errorCount: 0,
    signatures: []
};

function onBuy() {
    results.buyCount++;
}

function onSell() {
    results.sellCount++;
}

// Start the ingester
const cleanup = startSolanaIngester(REQUIRED_ENV.POOL_ADDRESS, onBuy, onSell);

// Wait for capture window
setTimeout(async () => {
    console.log('\n[4/4] Capture complete. Generating results...\n');

    // Stop ingester
    cleanup();

    // Get recent signatures for analysis
    let recentSigs = [];
    try {
        recentSigs = await getSignaturesForAddress(REQUIRED_ENV.POOL_ADDRESS, 10);
    } catch (err) {
        console.error(`Error fetching signatures: ${err.message}`);
    }

    // Print results
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    CAPTURE RESULTS                           ║');
    console.log('║  Copy everything below this line and paste to ChatGPT       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('```');
    console.log('=== SOLANA RPC CAPTURE RESULTS ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`POOL_ADDRESS: ${REQUIRED_ENV.POOL_ADDRESS}`);
    console.log(`RPC_URL: ${REQUIRED_ENV.RPC_URL}`);
    console.log(`Capture duration: ${CAPTURE_DURATION_MS}ms`);

    console.log(`\nBUY events detected: ${results.buyCount}`);
    console.log(`SELL events detected: ${results.sellCount}`);
    console.log(`Total swaps: ${results.buyCount + results.sellCount}`);

    // Show recent signatures with classification
    if (recentSigs.length > 0) {
        console.log('\n--- RECENT TRANSACTIONS (last 10) ---');
        for (let i = 0; i < Math.min(10, recentSigs.length); i++) {
            const sig = recentSigs[i].signature;
            let classification = 'fetching...';
            try {
                const tx = await getTransaction(sig);
                classification = classifySwap(tx, REQUIRED_ENV.POOL_ADDRESS) || 'UNKNOWN';
            } catch (e) {
                classification = `ERROR: ${e.message}`;
            }
            console.log(`${i + 1}. ${sig.slice(0, 30)}... => ${classification.toUpperCase()}`);
        }
    }

    console.log('\n--- ANALYSIS ---');
    console.log(`RPC connection: ${recentSigs.length > 0 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Swaps detected: ${results.buyCount + results.sellCount > 0 ? 'YES' : 'NO'}`);

    console.log('\n=== END RESULTS ===');
    console.log('```');

    process.exit(0);
}, CAPTURE_DURATION_MS);

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n\nCapture interrupted. Cleaning up...');
    cleanup();
    process.exit(1);
});
