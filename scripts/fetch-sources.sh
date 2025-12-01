#!/bin/bash

set -e

TREEISH="${1:-main}"
TARGET_DIR="${2:-external-services}"

mkdir -p "$TARGET_DIR"

for service in technical financial forecasting; do
	REPO_URL="https://github.com/ReLIFE-Project-EU/relife-${service}-service.git"
	LOCAL_PATH="${TARGET_DIR}/relife-${service}-service"

	echo "Processing relife-${service}-service..."

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
done
