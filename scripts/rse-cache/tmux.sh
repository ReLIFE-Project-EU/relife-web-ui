#!/bin/bash
set -euo pipefail

SESSION_NAME="rse-seed"
LOG_DIR=".work/rse-seed-logs"

cmd_launch() {
  if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Error: tmux session '$SESSION_NAME' already running." >&2
    exit 1
  fi

  mkdir -p "$LOG_DIR"
  local log
  log="$LOG_DIR/rse-seed-$(date +%Y%m%d-%H%M%S).log"

  # Resolve project root relative to this script's location
  local root_dir
  root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
  local abs_log="${root_dir}/${log}"

  # Quoted args for a login shell so PATH matches interactive SSH (linuxbrew, nvm, fnm, …).
  # Ensure the first `node` on PATH supports --experimental-strip-types (Node 22+); npm uses that binary.
  # pipefail: if task rse-seed fails, the pipeline exit status is non-zero (tee alone would mask it).
  local seed_args
  seed_args="$(printf '%q ' "$@")"
  local escaped_log inner
  escaped_log="$(printf '%q' "$abs_log")"
  inner="set -o pipefail; task rse-seed -- ${seed_args} 2>&1 | tee ${escaped_log}"

  tmux new-session -d -s "$SESSION_NAME" -c "$root_dir" \
    bash -lc "eval $(printf '%q' "$inner")"

  echo "Session: $SESSION_NAME"
  echo "Log:     $abs_log"
  echo "Attach:  task rse-seed:tmux-attach"
  echo "Kill:    task rse-seed:tmux-kill"
}

cmd_attach() {
  tmux attach -t "$SESSION_NAME"
}

cmd_kill() {
  tmux send-keys -t "$SESSION_NAME" C-c 2>/dev/null || true
  sleep 2
  tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
}

cmd_status() {
  if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "$SESSION_NAME: active"
  else
    echo "$SESSION_NAME: not running"
  fi
}

case "${1:-}" in
  launch) shift; cmd_launch "$@" ;;
  attach) cmd_attach ;;
  kill)   cmd_kill ;;
  status) cmd_status ;;
  *)      echo "Usage: $0 {launch|attach|kill|status}" >&2; exit 1 ;;
esac
