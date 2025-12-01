#!/bin/bash

set -e

REPO_URL="$1"
TREEISH="$2"
LOCAL_PATH="$3"

if [ -z "$REPO_URL" ] || [ -z "$TREEISH" ] || [ -z "$LOCAL_PATH" ]; then
	echo "Usage: $0 <REPO_URL> <TREEISH> <LOCAL_PATH>"
	exit 1
fi

echo "Processing ${LOCAL_PATH}..."

# Ensure parent directory exists
mkdir -p "$(dirname "$LOCAL_PATH")"

if [ -d "$LOCAL_PATH" ]; then
	echo "  Directory exists, fetching latest..."
	(cd "$LOCAL_PATH" && git fetch origin)
else
	echo "  Cloning repository..."
	git clone "$REPO_URL" "$LOCAL_PATH"
fi

echo "  Checking out ${TREEISH}..."
(cd "$LOCAL_PATH" && git checkout "${TREEISH}")

# If it's a branch (like main), pull latest
if (cd "$LOCAL_PATH" && git show-ref --verify --quiet "refs/heads/${TREEISH}"); then
	echo "  Pulling latest changes for branch ${TREEISH}..."
	(cd "$LOCAL_PATH" && git pull origin "${TREEISH}")
fi
