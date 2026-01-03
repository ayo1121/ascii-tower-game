require('dotenv').config();

const WebSocket = require('ws');
const { startHeliusIngester } = require('./heliusIngest');
const { initPersistence, loadState, saveState, closePersistence } = require('./persistence');

const PORT = process.env.PORT || 8080;
const DECAY_CHECK_INTERVAL_MS = 10000;
const DECAY_SILENCE_MS = 5 * 60 * 1000;
const MAX_LOG_ENTRIES = 100;
const WRITE_DEBOUNCE_MS = 500;

// REQUIRED config
const RPC_HTTP_URL = process.env.RPC_HTTP_URL;
const RPC_WS_URL = process.env.RPC_WS_URL;
const POOL_ADDRESS = process.env.POOL_ADDRESS;

// Validate config
if (!RPC_HTTP_URL) {
    console.error('[FATAL] RPC_HTTP_URL is required.');
    process.exit(1);
}
if (!RPC_WS_URL) {
    console.error('[FATAL] RPC_WS_URL is required.');
    process.exit(1);
}
if (!POOL_ADDRESS) {
    console.error('[FATAL] POOL_ADDRESS is required.');
    process.exit(1);
}

console.log('[Server] Using HELIUS ingestion');
console.log(`[Server] Watching POOL_ADDRESS: ${POOL_ADDRESS}`);

// Game state
let gameState = {
    height: 0,
    lastActionTs: Date.now(),
    status: "alive",
    log: []
};

// Initialize persistence and server
async function startServer() {
    // 1. Initialize persistence (Postgres or File)
    await initPersistence();

    // 2. Load state
    const loadedState = await loadState();
    gameState = loadedState;
    console.log(`[Server] Loaded state: height=${gameState.height}`);

    // 3. Start HTTP + WebSocket server
    // Railway requires binding to 0.0.0.0 (implied) and specific PORT
    const http = require('http');
    const server = http.createServer((req, res) => {
        if (req.url === '/health') {
            res.writeHead(200);
            res.end('ok');
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    const wss = new WebSocket.Server({ server });

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`[Server] Listening on port ${PORT}`);
    });

    // Persistence debouncer
    let writeTimer = null;
    function persistState() {
        if (writeTimer) {
            clearTimeout(writeTimer);
        }
        writeTimer = setTimeout(() => {
            saveState(gameState);
        }, WRITE_DEBOUNCE_MS);
    }

    // Broadcast helper
    function broadcast() {
        const message = JSON.stringify({ type: "STATE_UPDATE", state: gameState });
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    // Log helper
    function addLog(message) {
        gameState.log.push({ ts: Date.now(), message });
        if (gameState.log.length > MAX_LOG_ENTRIES) {
            gameState.log = gameState.log.slice(-MAX_LOG_ENTRIES);
        }
    }

    // Event handlers
    function handleBuy() {
        gameState.height += 1;
        gameState.lastActionTs = Date.now();
        addLog(`block added (height: ${gameState.height})`);
        broadcast();
        persistState();
    }

    function handleSell() {
        if (gameState.height === 0) return;

        const prevHeight = gameState.height;
        gameState.height -= 1;
        gameState.lastActionTs = Date.now();
        addLog(`block removed (height: ${gameState.height})`);

        if (prevHeight > 0 && gameState.height === 0) {
            addLog("tower empty");
        }

        broadcast();
        persistState();
    }

    function checkDecay() {
        if (gameState.height === 0) return;

        const now = Date.now();
        if (now - gameState.lastActionTs >= DECAY_SILENCE_MS) {
            const prevHeight = gameState.height;
            gameState.height -= 1;
            gameState.lastActionTs = now;
            addLog(`decay (height: ${gameState.height})`);

            if (prevHeight > 0 && gameState.height === 0) {
                addLog("tower empty");
            }

            broadcast();
            persistState();
        }
    }

    setInterval(checkDecay, DECAY_CHECK_INTERVAL_MS);

    // WebSocket handlers
    wss.on('connection', (ws) => {
        console.log('[Server] Client connected');
        ws.send(JSON.stringify({ type: "STATE_UPDATE", state: gameState }));

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                if (message.type === "BUY") {
                    handleBuy();
                } else if (message.type === "SELL") {
                    handleSell();
                }
            } catch (err) {
                console.error('[Server] Failed to parse message:', err);
            }
        });

        ws.on('close', () => {
            console.log('[Server] Client disconnected');
        });
    });

    // Start Ingestion
    startHeliusIngester(POOL_ADDRESS, handleBuy, handleSell);

    // Graceful shutdown
    const shutdown = async () => {
        console.log('[Server] Shutting down...');
        if (writeTimer) {
            clearTimeout(writeTimer);
            await saveState(gameState); // Force save
        }
        await closePersistence();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

startServer().catch(err => {
    console.error('[FATAL] Server failed to start:', err);
    process.exit(1);
});
