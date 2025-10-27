#!/bin/bash

# GitHub push script for Hefer Projects
# Usage: ./push.sh "Your commit message"

# Configuration
# GITHUB_TOKEN should be set as an environment variable or provided via git credential manager
REPO_URL="github.com/pzhefer/Hefer-Projects.git"
BRANCH="main"

# Get commit message from argument or use default
COMMIT_MSG="${1:-Update project}"

# Configure git user if not already set
git config user.name "PieterHefer" 2>/dev/null || true
git config user.email "pzhefer@gmail.com" 2>/dev/null || true

# Set remote URL (without embedding token)
git remote set-url origin "https://${REPO_URL}" 2>/dev/null || \
  git remote add origin "https://${REPO_URL}"

# Add all changes
echo "Adding files..."
git add -A

# Commit changes
echo "Committing changes..."
git commit -m "$COMMIT_MSG"

# Push to GitHub
echo "Pushing to GitHub..."
git push -u origin "$BRANCH"

echo "✓ Successfully pushed to GitHub!"
