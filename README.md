# building a building
a live, on-chain ASCII tower driven by real trades

This project is an experimental interface that visualizes trading activity as a single, shared structure. It strips away charts, candles, and prices, leaving only the collective action of buyers and sellers.

Each buy transaction adds a block to the tower. Each sell transaction removes one. The height of the tower represents the net pressure of the market in real-time, derived directly from on-chain Solana data.

---

## How it Works

- **Ingest**: The backend listens to a specific liquidity pool via Helius WebSocket (`onLogs`) and RPC (`getParsedTransaction`).
- **Classification**: Transactions are analyzed for token flow:
  - If the pool loses meme tokens -> BUY
  - If the pool gains meme tokens -> SELL
- **State**: The backend maintains the current tower height and a short log of recent events.
- **Broadcast**: The state is broadcast to all connected clients via WebSocket.
- **Interface**: The frontend renders the state as a raw ASCII tower.

## Structure

```
ascii-tower-game/
├── backend/        # Node.js server + Helius ingest
├── frontend/       # React + Vite ASCII UI
├── scripts/        # Deployment / automation helpers
└── README.md
```

## Running Locally

### Backend
The backend ingests trades and serves the WebSocket state.

1. Navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```

2. Configure environment variables in `.env`:
   ```bash
   RPC_HTTP_URL=https://...
   RPC_WS_URL=wss://...
   POOL_ADDRESS=...
   ```

3. Start the server:
   ```bash
   npm start
   ```
   *Runs on port 8080 by default.*

### Frontend
The frontend connects to the backend and renders the tower.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```
   *Connects to `ws://localhost:8080` by default.*

## Deployment

### Backend (Railway)
The backend must run as a persistent service to maintain state and real-time connectivity.
- Deploy to Railway (or similar).
- Ensure `PORT` is bound (Railway sets this automatically).
- **Persistence**: Add a Postgres database (`DATABASE_URL`) to survive restarts.

### Frontend (Static)
The frontend is a static React application.
- Deploy to Vercel, Netlify, or similar.
- Set `VITE_WS_URL` to your production backend WebSocket URL (e.g., `wss://your-backend.up.railway.app`).

## Environment Variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `RPC_HTTP_URL` | Backend | Helius HTTPS RPC URL |
| `RPC_WS_URL` | Backend | Helius WSS RPC URL |
| `POOL_ADDRESS` | Backend | Target Liquidity Pool Address |
| `COMMITMENT` | Backend | Solana commitment level (default: confirmed) |
| `INGEST_DEBUG` | Backend | Set `true` for verbose transaction logs |
| `DATABASE_URL` | Backend | Postgres connection string (for persistence) |
| `VITE_WS_URL` | Frontend | WebSocket endpoint for game state |

## Philosophy

This project is an exploration of minimal financial interfaces. It avoids the noise of traditional trading terminals in favor of a signal that feels more organic and physical. The tower is the only metric that matters.

## Disclaimer

This is an experimental software project. It provides visualization of on-chain data only and does not constitute financial advice.
