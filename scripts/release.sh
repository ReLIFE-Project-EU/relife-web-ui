#!/bin/sh
set -eu

log() {
  printf 'release: %s\n' "$*"
}

err() {
  printf 'release: %s\n' "$*" >&2
}

usage() {
  cat >&2 <<'EOF'
Usage: task release -- <major|minor|patch> [--dry-run]

Bumps package.json version, commits with a gitmoji release message, creates an
annotated vX.Y.Z tag, and pushes it. The pushed tag triggers the GHCR docker
publish workflow.

  major|minor|patch   SemVer bump level (case-insensitive)
  --dry-run           Print planned version and commands without mutating

Guards: must run on `main`, working tree must be clean (porcelain), and
`task format-lint` must pass.
EOF
}

to_lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

DRY_RUN=0
LEVEL=""

for arg in "$@"; do
  case "$(to_lower "$arg")" in
    --dry-run|-n)
      DRY_RUN=1
      ;;
    major|minor|patch)
      LEVEL="$(to_lower "$arg")"
      ;;
    -h|--help|help)
      usage
      exit 0
      ;;
    *)
      err "unknown argument: $arg"
      usage
      exit 2
      ;;
  esac
done

if [ -z "$LEVEL" ]; then
  err "missing required <major|minor|patch> argument"
  usage
  exit 2
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" != "main" ]; then
  err "releases must run on main (currently on: $BRANCH)"
  exit 3
fi

CURRENT="$(node -p "require('./package.json').version")"

if ! printf '%s' "$CURRENT" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  err "current package.json version ($CURRENT) is not X.Y.Z"
  exit 5
fi

MAJOR="${CURRENT%%.*}"
REST="${CURRENT#*.}"
MINOR="${REST%%.*}"
PATCH="${REST#*.}"

case "$LEVEL" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac

NEXT="${MAJOR}.${MINOR}.${PATCH}"
TAG="v${NEXT}"
COMMIT_MSG="🔖 release ${TAG}"

if [ "$DRY_RUN" -eq 1 ]; then
  log "dry-run: no mutations will be performed"
  log "current version: $CURRENT"
  log "next version:    $NEXT ($LEVEL)"
  log "planned commands:"
  log "  npm version $LEVEL --no-git-tag-version --no-commit-hooks"
  log "  git add package.json"
  log "  git commit -m \"$COMMIT_MSG\""
  log "  git tag -a \"$TAG\" -m \"$COMMIT_MSG\""
  log "  git push"
  log "  git push origin \"$TAG\""
  exit 0
fi

PORCELAIN="$(git status --porcelain)"
if [ -n "$PORCELAIN" ]; then
  err "working tree is not clean; commit or stash the following first:"
  printf '%s\n' "$PORCELAIN" >&2
  exit 4
fi

log "running lint gate (task format-lint)..."
if ! task format-lint; then
  err "lint gate failed; aborting release"
  exit 6
fi

log "current version: $CURRENT"
log "next version:    $NEXT ($LEVEL)"

npm version "$LEVEL" --no-git-tag-version --no-commit-hooks >/dev/null

log "committing release..."
git add package.json
git commit -m "$COMMIT_MSG" >/dev/null

log "creating annotated tag $TAG..."
git tag -a "$TAG" -m "$COMMIT_MSG"

log "pushing main and tag..."
git push
git push origin "$TAG"

log "released $TAG (pushed tag triggers the GHCR docker publish workflow)"