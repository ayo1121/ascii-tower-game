#!/bin/bash
set -e

REPO_DIR="/mnt/c/Users/User/.gemini/antigravity/scratch/ascii-tower-game"
cd "$REPO_DIR"

echo "=== WSL AUTOMATED DEPLOYMENT ==="
echo "Working Directory: $(pwd)"

# 1. Config Git Identity (Local)
git config user.name "ayo"
git config user.email "ayo@users.noreply.github.com"

# 2. Check Git Status
if [ -n "$(git status --porcelain)" ]; then
    echo "Uncommitted changes detected. Committing..."
    git add .
    git commit -m "deploy: helius ingest + ui polish"
else
    echo "Git working directory is clean."
fi

# 3. Check gh CLI
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI (gh) could not be found."
    echo "Attempting install..."
    # Attempt install without sudo password first (might fail)
    sudo apt update && sudo apt install -y gh || {
        echo "ERROR: Failed to install 'gh'. You may need to run 'sudo apt install gh' manually."
        exit 1
    }
fi
echo "GitHub CLI version: $(gh --version | head -n 1)"

# 4. Check Auth
if ! gh auth status &> /dev/null; then
    echo "--------------------------------------------------------"
    echo "ERROR: Not authenticated to GitHub in WSL."
    echo "Please run the following command in your WSL terminal:"
    echo "    gh auth login"
    echo "--------------------------------------------------------"
    exit 1
else
    echo "Authenticated as: $(gh api user --jq .login)"
fi

# 5. Create/Reuse Repo
REPO_NAME="ascii-tower-game"
FULL_REPO="ayo/$REPO_NAME"

# Check if repo exists
if gh repo view "$FULL_REPO" &> /dev/null; then
    echo "Repository '$FULL_REPO' already exists."
else
    echo "Creating repository '$FULL_REPO'..."
    gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
fi

# 6. Ensure Remote is Correct
# We prefer standard HTTPS for automation reliability unless SSH is strictly configured
# But user requested SSH preference. We'll check if we have keys.
if [ -f ~/.ssh/id_rsa.pub ] || [ -f ~/.ssh/id_ed25519.pub ]; then
    URL="git@github.com:$FULL_REPO.git"
    echo "SSH keys found. Setting remote to SSH: $URL"
else
    URL="https://github.com/$FULL_REPO.git"
    echo "No SSH keys found. Setting remote to HTTPS: $URL"
fi

if git remote | grep -q "^origin$"; then
    git remote set-url origin "$URL"
else
    git remote add origin "$URL"
fi

# 7. Push
echo "Pushing main branch..."
git branch -M main
git push -u origin main

# 8. Verification & Output
echo "--------------------------------------------------------"
echo "DEPLOYMENT COMPLETE"
echo "Repo URL: https://github.com/$FULL_REPO"
echo "Remote Origin: $(git remote get-url origin)"
echo "Latest Commit: $(git rev-parse HEAD)"
echo "--------------------------------------------------------"

# Check for secrets
echo "Checking for leaked secrets in index..."
LEAKS=$(git ls-files | grep -E '\.env|backend/state\.json' || true)
if [ -z "$LEAKS" ]; then
    echo "✅ SUCCESS: No secrets (.env or state.json) tracked in git."
else
    echo "❌ WARNING: The following secrets are tracked:"
    echo "$LEAKS"
fi
