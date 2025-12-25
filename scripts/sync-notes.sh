#!/bin/bash

# --- Configuration ---
REPO_DIR="/root/vibe-investing-data"
TARGET_DIR="personal-notes"
LOG_FILE="/root/notes_sync.log"
BRANCH="main"  # Check if your repo uses 'main' or 'master'
# ---------------------

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 1. Navigate to the git repository
cd "$REPO_DIR" || { log "CRITICAL: Could not find directory $REPO_DIR"; exit 1; }

# 2. Pull latest changes
# --autostash: Stashes your local changes, pulls, then pops them back (prevents "local changes would be overwritten" errors)
# --rebase: Keeps history clean without unnecessary merge commits
output=$(git pull --rebase --autostash origin "$BRANCH" 2>&1)
pull_status=$?

if [ $pull_status -ne 0 ]; then
    log "ERROR: Git pull failed. Details below:"
    echo "$output" >> "$LOG_FILE"
    # We exit here to prevent pushing if the pull was broken (avoids conflicts)
    exit 1
fi

# 3. Check for unstaged/uncommitted changes in the specific folder
if [ -n "$(git status --porcelain "$TARGET_DIR")" ]; then
    log "Changes detected in $TARGET_DIR. Syncing..."

    # Stage only the personal-notes folder
    git add "$TARGET_DIR"

    # Commit
    git commit -m "Auto-sync: $(date '+%Y-%m-%d %H:%M')" >> "$LOG_FILE" 2>&1

    # Push
    git push origin "$BRANCH" >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        log "SUCCESS: Notes synced to remote."
    else
        log "ERROR: Git push failed."
    fi
else
    # Optional: Uncomment the line below if you want logs every time it runs (can get spammy)
    # log "No local changes to sync."
    :
fi