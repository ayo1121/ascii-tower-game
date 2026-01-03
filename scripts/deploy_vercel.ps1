# Vercel Deployment Script
$ErrorActionPreference = "Stop"

function Check-Command ($cmd) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
        npm i -g vercel
    }
}

Write-Host "=== FRONTEND DEPLOYMENT (VERCEL) ===" -ForegroundColor Cyan

# 1. Install CLI
Check-Command "vercel"

# 2. Login
if (-not (vercel whoami 2>$null)) {
    Write-Host "Please login to Vercel:" -ForegroundColor Yellow
    vercel login
}

# 3. Enter Backend URL
$wsUrl = Read-Host "Enter your Railway WebSocket URL (e.g. wss://backend.up.railway.app)"
if (-not $wsUrl) {
    Write-Host "Error: WebSocket URL is required." -ForegroundColor Red
    exit 1
}

# 4. Deploy
Set-Location frontend
Write-Host "Deploying..." -ForegroundColor Cyan

# Link/Create Project
# We use --yes to accept defaults, but we need to pass env vars.
# Strategy: Run 'vercel pull' to link first? No, 'vercel link' is interactive.
# We'll rely on standard 'vercel' flow which is interactive for the first time.

Write-Host "NOTE: If asked, set 'Root Directory' to 'frontend' (or just ./ if we are already inside)." -ForegroundColor Yellow

# Pull environment variables if exists, or create
vercel link --yes --project "building-a-building" 2>$null

# Set Env Var (Production)
Write-Host "Setting VITE_WS_URL..."
echo $wsUrl | vercel env add VITE_WS_URL production 2>$null

# Deploy Production
vercel --prod

Write-Host "`n=== DEPLOYMENT COMPLETE ===" -ForegroundColor Green
