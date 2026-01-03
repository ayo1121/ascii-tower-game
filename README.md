# ASCII Tower Game - Backend Deployment

This backend allows the "building a building" game to update in real-time based on Solana swaps. It is optimized for Railway deployment.

## 🚀 Quickstart (Local)

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment:**
   Copy `.env.example` to `.env` and fill in your Helius credentials.

3. **Start Server:**
   ```bash
   npm start
   ```

## 🚂 Railway Deployment (Automated)

**Prerequisites:**
- [Git](https://git-scm.com/downloads)
- [Railway CLI](https://docs.railway.app/guides/cli) (`npm i -g @railway/cli`)
- [GitHub CLI (Optional)](https://cli.github.com/) (for auto-creating repo)

**One-Command Deploy (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1
```
This script will:
1. Initialize/Push to GitHub
2. Initialize/Link Railway Project
3. Ask for Environment Variables
4. Deploy to Production

## 🔧 Manual Deployment

1. **Push to GitHub**
2. **Railway Dashboard:**
   - Create New Project -> Deploy from GitHub
   - Select this repo
   - **Root Directory:** Set to `/backend` (if not using `railway.json`)
   - Add Variables: `RPC_HTTP_URL`, `RPC_WS_URL`, `POOL_ADDRESS`

## 🌍 Environment Variables

| Variable | Description |
|----------|-------------|
| `RPC_HTTP_URL` | Helius HTTPS URL (Required) |
| `RPC_WS_URL` | Helius WSS URL (Required) |
| `POOL_ADDRESS` | Target Pool Address (Required) |
| `DATABASE_URL` | Postgres URL for persistence (Optional, Recommended) |
| `PORT` | Auto-set by Railway (Default: 8080) |

## 📡 API Endpoints

- **WebSocket**: `/` (Main game feed)
- **Health Check**: `GET /health` -> `200 OK`
