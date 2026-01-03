Write-Host "=== AUTOMATED RELEASE SCRIPT ===" -ForegroundColor Magenta

# 1. Publish to GitHub
.\scripts\publish_github.ps1
if ($LASTEXITCODE -ne 0) { exit 1 }

# 2. Deploy to Railway
.\scripts\deploy_railway.ps1
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n=== RELEASE COMPLETE ===" -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "1. Get public URL from Railway Dashboard"
Write-Host "2. Update frontend .env with wss://<railway-url>"
