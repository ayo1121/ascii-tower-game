# Auto Deploy Script (Robust)
$ErrorActionPreference = "Stop"

function Check-Command ($cmd, $installMsg) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: '$cmd' CLI is missing." -ForegroundColor Red
        Write-Host $installMsg -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "=== DEPLOYMENT PRE-FLIGHT CHECK ===" -ForegroundColor Cyan

# 1. Check Tools
Check-Command "git" "Please install Git."
Check-Command "gh" "Run: winget install GitHub.cli"
Check-Command "railway" "Run: npm i -g @railway/cli"

# 2. Check Auth
if (-not (gh auth status 2>&1 | Select-String "Logged in")) {
    Write-Host "Please login to GitHub CLI:" -ForegroundColor Yellow
    Write-Host "gh auth login"
    exit 1
}
if (-not (railway whoami)) {
    Write-Host "Please login to Railway CLI:" -ForegroundColor Yellow
    Write-Host "railway login"
    exit 1
}

# 3. Execution
Write-Host "Tools & Auth Verified. Starting Deployment..." -ForegroundColor Green

# Git Push
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    gh repo create ascii-tower-game --public --source=. --remote=origin -y
}
git push -u origin main -f

# Railway Deploy
if (-not (Test-Path .railway)) {
    railway init --name "building-a-building-backend"
}

# Env Vars
railway variables set "RPC_HTTP_URL=https://mainnet.helius-rpc.com/?api-key=837c2c48-6328-44b6-a49f-3a25e0567a96" "RPC_WS_URL=wss://mainnet.helius-rpc.com/?api-key=837c2c48-6328-44b6-a49f-3a25e0567a96" "POOL_ADDRESS=DM7dfXxt2jRZxpfqwGxcbdeYDp3DdC43QbMCNLSww3AP" "COMMITMENT=confirmed" "INGEST_DEBUG=false" "PORT=8080"

railway up --detach --service backend

$domain = railway domain
Write-Host "`nSUCCESS! Your backend is live at:" -ForegroundColor Green
Write-Host "https://$domain"
Write-Host "WSS URL: wss://$domain"
