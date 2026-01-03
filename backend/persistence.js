/**
 * Persistence Module
 * Optimized for Railway (Postgres) with local filesystem fallback.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const STATE_FILE = path.join(__dirname, 'state.json');

// Initial empty state
const DEFAULT_STATE = {
    height: 0,
    lastActionTs: Date.now(),
    log: []
};

let dbPool = null;
let usePostgres = false;

// Initialize persistence
async function initPersistence() {
    if (DATABASE_URL) {
        console.log('[Persistence] DATABASE_URL found. Connecting to Postgres...');
        try {
            dbPool = new Pool({
                connectionString: DATABASE_URL,
                ssl: { rejectUnauthorized: false } // Required for Railway
            });

            // Ensure table exists
            await dbPool.query(`
                CREATE TABLE IF NOT EXISTS game_state (
                    id TEXT PRIMARY KEY,
                    height INTEGER NOT NULL,
                    last_action_ts BIGINT NOT NULL,
                    log JSONB NOT NULL,
                    updated_at TIMESTAMP NOT NULL DEFAULT now()
                );
            `);

            // Check if row exists, if not create it
            const res = await dbPool.query("SELECT * FROM game_state WHERE id = 'global'");
            if (res.rows.length === 0) {
                const initLog = JSON.stringify(DEFAULT_STATE.log);
                await dbPool.query(
                    "INSERT INTO game_state (id, height, last_action_ts, log) VALUES ('global', $1, $2, $3)",
                    [DEFAULT_STATE.height, DEFAULT_STATE.lastActionTs, initLog]
                );
                console.log('[Persistence] Initialized global state in Postgres');
            }

            usePostgres = true;
            console.log('[Persistence] Using Postgres storage');
        } catch (err) {
            console.error('[Persistence] Postgres connection failed:', err.message);
            console.log('[Persistence] Falling back to file storage');
            usePostgres = false;
        }
    } else {
        console.log('[Persistence] No DATABASE_URL. Using file storage');
        usePostgres = false;
    }
}

// Load state
async function loadState() {
    if (usePostgres) {
        try {
            const res = await dbPool.query("SELECT height, last_action_ts, log FROM game_state WHERE id = 'global'");
            if (res.rows.length > 0) {
                const row = res.rows[0];
                return {
                    height: row.height,
                    lastActionTs: parseInt(row.last_action_ts),
                    log: row.log
                };
            }
        } catch (err) {
            console.error('[Persistence] Failed to load from Postgres:', err.message);
        }
    } else {
        // File fallback
        try {
            if (fs.existsSync(STATE_FILE)) {
                const data = fs.readFileSync(STATE_FILE, 'utf-8');
                return JSON.parse(data);
            }
        } catch (err) {
            console.error('[Persistence] Failed to load state file:', err.message);
        }
    }
    return { ...DEFAULT_STATE };
}

// Save state
async function saveState(state) {
    if (usePostgres) {
        try {
            const logJson = JSON.stringify(state.log);
            await dbPool.query(
                `UPDATE game_state 
                 SET height = $1, last_action_ts = $2, log = $3, updated_at = now() 
                 WHERE id = 'global'`,
                [state.height, state.lastActionTs, logJson]
            );
        } catch (err) {
            console.error('[Persistence] Failed to save to Postgres:', err.message);
        }
    } else {
        // File fallback
        try {
            const tempFile = STATE_FILE + '.tmp';
            fs.writeFileSync(tempFile, JSON.stringify(state, null, 2));
            fs.renameSync(tempFile, STATE_FILE);
        } catch (err) {
            console.error('[Persistence] Failed to save state file:', err.message);
        }
    }
}

// Close connections
async function closePersistence() {
    if (dbPool) {
        await dbPool.end();
    }
}

module.exports = {
    initPersistence,
    loadState,
    saveState,
    closePersistence
};
