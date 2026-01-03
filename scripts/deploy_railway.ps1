# Check if Railway CLI is installed
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Railway CLI is not installed." -ForegroundColor Red
    Write-Host "Install via: npm i -g @railway/cli"
    exit 1
}

# Login check
if (-not (railway whoami)) {
    Write-Host "Please login to Railway..." -ForegroundColor Yellow
    railway login
}

# Check if linked
if (-not (Test-Path .railway)) {
    Write-Host "Linking project..." -ForegroundColor Cyan
    $response = Read-Host "Create new project? (y/n)"
    if ($response -eq 'y') {
        railway init
    } else {
        railway link
    }
}

# Env Vars Prompt
Write-Host "`n--- Environment Configuration ---" -ForegroundColor Cyan
Write-Host "Enter values to set in Railway (leave empty to skip):"

$rpcHttp = Read-Host "RPC_HTTP_URL"
$rpcWs = Read-Host "RPC_WS_URL"
$poolAddr = Read-Host "POOL_ADDRESS"

if ($rpcHttp) { railway variables set "RPC_HTTP_URL=$rpcHttp" }
if ($rpcWs) { railway variables set "RPC_WS_URL=$rpcWs" }
if ($poolAddr) { railway variables set "POOL_ADDRESS=$poolAddr" }

# Deploy
Write-Host "`n--- Deploying ---" -ForegroundColor Cyan
railway up --detach

Write-Host "`nDeployment triggered!" -ForegroundColor Green
Write-Host "Run 'railway logs' to monitor."
