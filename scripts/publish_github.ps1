# Check if git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Git is not installed." -ForegroundColor Red
    exit 1
}

# Check if gh CLI is installed
$useGh = $false
if (Get-Command gh -ErrorAction SilentlyContinue) {
    if (gh auth status) {
        $useGh = $true
    }
}

Write-Host "Initializing Git..." -ForegroundColor Cyan
if (-not (Test-Path .git)) {
    git init
}

# Add all files
git add .
git commit -m "Initial commit for Railway deployment"

# Check if remote exists
$remotes = git remote
if (-not $remotes) {
    Write-Host "No remote repository found." -ForegroundColor Yellow
    
    if ($useGh) {
        $response = Read-Host "Create new GitHub repo automatically? (y/n)"
        if ($response -eq 'y') {
            $repoName = Read-Host "Enter repo name (default: ascii-tower-backend)"
            if (-not $repoName) { $repoName = "ascii-tower-backend" }
            
            # Create private repo
            gh repo create $repoName --private --source=. --remote=origin
            
            # Push
            Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
            git push -u origin main
            
            Write-Host "Successfully published to GitHub!" -ForegroundColor Green
            exit 0
        }
    }
    
    Write-Host "Please set remote manually:" -ForegroundColor Yellow
    Write-Host "git remote add origin <your-repo-url>"
    Write-Host "git push -u origin main"
} else {
    Write-Host "Pushing to existing remote..." -ForegroundColor Cyan
    git push
    Write-Host "Code pushed to GitHub." -ForegroundColor Green
}
