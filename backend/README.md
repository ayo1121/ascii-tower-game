# ASCII Tower Game - Backend Deployment

This backend allows the "building a building" game to update in real-time based on Solana swaps. It is designed to be deployed on Railway.

## 🚀 Railway Deployment Checklist

### 1. Push to GitHub
Ensure this entire repository (including `backend/`) is pushed to a GitHub repository.

### 2. Create New Service in Railway
1. Go to your Railway Dashboard.
2. Click **"New Project"** -> **"Deploy from GitHub repo"**.
3. Select your repository.
4. **IMPORTANT**: Since this is a specialized backend, you must configure the **Root Directory** settings if it's in a subfolder:
   - Go to **Settings** -> **Root Directory** -> Set to `/backend`.
   - Alternatively, Railway might ask for this during setup.

### 3. Configure Environment Variables
Go to the **Variables** tab and add the following:

| Variable | Value (Example) | Description |
|----------|-----------------|-------------|
| `RPC_HTTP_URL` | `https://mainnet.helius-rpc.com/...` | Your Helius HTTPS URL with API key |
| `RPC_WS_URL` | `wss://mainnet.helius-rpc.com/...` | Your Helius WSS URL with API key |
| `POOL_ADDRESS` | `DM7dfXxt2jRZxpfqwGxcbdeYDp3DdC43QbMCNLSww3AP` | Target Pool Address |
| `COMMITMENT` | `confirmed` | (Optional) Solana commitment |
| `INGEST_DEBUG` | `false` | (Optional) Set true for debug logs |
| `PORT` | `8080` (or leave default) | Railway sets this automatically |

### 4. Add Persistence (Recommended)
To ensure the tower survives restarts:
1. In Railway, click **"New"** -> **"Database"** -> **"PostgreSQL"**.
2. Once deployed, get the `DATABASE_URL` from the Postgres service.
3. Add `DATABASE_URL` to your Backend Service variables.
   - *Note: Railway normally auto-injects this if you link the services.*

### 5. Verify Deployment
- Go to the **Deployments** tab.
- Click "View Logs".
- You should see:
  ```
  [Server] Listening on port <PORT>
  [Persistence] DATABASE_URL found. Connecting to Postgres...
  [Server] Using HELIUS ingestion
  [HeliusIngest] Subscribed to logs
  ```

## 🌐 Public URL
Railway assigns a public domain (e.g., `backend-production.up.railway.app`).
Your WebSocket URL will be:
`wss://backend-production.up.railway.app`

Use this URL in your frontend `.env` config.

## 🛠 Troubleshooting

**App crashes immediately:**
- Check Logs.
- Look for `[FATAL] ... is required`.
- Ensure all required variables are set in Railway.

**"No DATABASE_URL" warning:**
- The app will fall back to file storage (`state.json`), which gets wiped on redeploy. This is fine for testing but **bad for long-term consistency**. Add Postgres for durability.

**Frontend cannot connect:**
- Ensure you used `wss://` protocol.
- Ensure the backend service has a Public Domain generated in Railway Settings -> Networking.

**Health Check endpoint:**
- The backend exposes `GET /health` which returns `200 ok`. Railway can use this for health checks.
