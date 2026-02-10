---
name: service-bug-fix-pr
description: >
  Automates the full workflow for fixing a bug in one of the three upstream ReLIFE
  service repositories (financial, technical, forecasting) and opening a pull request.
  Use when you have identified a bug in a backend service and want to create a fix
  branch, apply the fix, commit, push, and open a PR against the upstream repository
  in a consistent and repeatable way.
---

# Service Bug Fix PR

Guides the complete workflow for contributing a bug fix to one of the three upstream
ReLIFE backend service repositories from the Web UI developer's perspective.

## Scope

The three service repositories are already checked out under `external-services/`
inside the current working directory. There is no cloning step.

| Service     | Local path                                     | GitHub URL                                                      |
| ----------- | ---------------------------------------------- | --------------------------------------------------------------- |
| Financial   | `external-services/relife-financial-service`   | https://github.com/ReLIFE-Project-EU/relife-financial-service   |
| Technical   | `external-services/relife-technical-service`   | https://github.com/ReLIFE-Project-EU/relife-technical-service   |
| Forecasting | `external-services/relife-forecasting-service` | https://github.com/ReLIFE-Project-EU/relife-forecasting-service |

All git commands use `git -C <service_path>` so the working directory of the shell
session is never changed. All edits happen inside the chosen service directory — never
inside the `relife-web-ui` repository itself.

---

## Workflow

Follow these steps in order. Do not skip steps. Get explicit user confirmation at each
gate marked **[GATE]** before proceeding.

---

### Step 1: Gather Context

Before touching any code, collect the following from the user (use `AskUserQuestion`
to get precise answers):

1. **Which service** contains the bug? (financial / technical / forecasting)
   Resolve to the corresponding local path from the table above — call it `<service_path>`.
2. **One-line bug description**: a concise sentence stating what is wrong and where
   (e.g., "the `/assess-risk` endpoint returns HTTP 500 when `building_age` is null").
3. **Fix summary**: one sentence describing the intended fix.
4. **Target base branch** (default: `main`). Ask the user to confirm.

Record these answers — they are referenced throughout the workflow.

---

### Step 2: Pre-flight Checks

Run these checks in parallel and report the result of each:

```bash
# GitHub CLI authentication
gh auth status

# git availability
git --version

# Verify the local service repo points to the expected remote
git -C <service_path> remote get-url origin
```

- If `gh auth status` fails: stop and tell the user to run `gh auth login` first.
- If the remote URL does not match the expected GitHub URL from the table above: stop
  and ask the user to resolve the discrepancy.

---

### Step 3: Fetch and Sync with Upstream

Ensure the local checkout is fully up to date with the upstream base branch:

```bash
git -C <service_path> fetch origin
git -C <service_path> checkout <base_branch>
git -C <service_path> pull origin <base_branch>
```

Report the latest commit hash and message so the user can verify the starting state:

```bash
git -C <service_path> log -1 --oneline
```

If there are local uncommitted changes on the base branch: stop and ask the user how to
proceed (stash, discard, or abort).

---

### Step 4: Create the Fix Branch

Derive the branch name from the bug description collected in Step 1.

**Branch naming convention**: `fix/<short-slug>`

Rules for the slug:
- Lowercase only
- Replace spaces and special characters with hyphens
- Maximum 40 characters
- Descriptive but concise (e.g., `fix/assess-risk-null-building-age`)

**[GATE]** Propose the branch name to the user and wait for confirmation or a preferred
alternative.

Once confirmed:

```bash
git -C <service_path> checkout -b fix/<slug>
```

Verify the branch is active:

```bash
git -C <service_path> branch --show-current
```

---

### Step 5: Inspect the Repository

Before applying any fix, understand the repository's conventions and code style:

1. List top-level files:
   ```bash
   ls <service_path>
   ```
2. Read `CONTRIBUTING.md` and `README.md` if present; summarize the relevant parts
   (commit style, testing requirements, linting) for the user.
3. Check recent commit messages to infer the commit convention:
   ```bash
   git -C <service_path> log --oneline -10
   ```
   Note the style (Conventional Commits, imperative sentences, ticket prefixes, etc.) —
   this will be used in Step 7.
4. Identify the test runner and linting commands:
   - For Node.js/TypeScript projects: read `package.json` scripts.
   - For Python projects: check `pyproject.toml`, `Makefile`, or `tox.ini`.

---

### Step 6: Gather Fix Context and Choose Implementation Mode

Before writing any code, collect additional context from the user to guide the fix.
Use `AskUserQuestion` for the mode selection; gather the rest as free-form input.

**6a. Ask the user for fix context** — any of the following they can provide:

- Specific file(s) and line numbers where the bug is located
- Relevant code snippets or error messages
- Pointers to related tests or configuration
- Any notes on what must NOT be changed

Record everything provided — it will be forwarded to the agent or used to validate
manual changes.

**6b. Ask the user which implementation mode to use**:

- **Agent-assisted** — delegate the implementation to a Claude agent (recommended for
  well-defined bugs where the fix is clear)
- **Manual** — the user writes the fix themselves; the skill resumes from the diff
  review once they are done
- **Hybrid** — the agent drafts a starting point, then the user refines it manually
  before the diff review

**[GATE]** Wait for the user to choose a mode before proceeding.

---

**If Agent-assisted or Hybrid:**

Delegate the implementation to the appropriate agent:

- **Simple, isolated change (1–3 files)**: `oh-my-claudecode:executor` (sonnet)
- **Complex change requiring architectural understanding**: `oh-my-claudecode:executor-high` (opus)

Provide the agent with:
- The `<service_path>` (so it writes to the correct directory)
- The bug description and fix summary from Step 1
- The additional context collected in Step 6a
- Relevant conventions from Step 5

For **Hybrid mode**: after the agent completes, tell the user the fix is ready for
manual refinement. Wait for the user to signal they are done editing before proceeding
to the diff review.

---

**If Manual:**

Tell the user to apply their changes to `<service_path>` and to notify you when done.
Wait. Do not proceed until the user explicitly says the changes are complete.

---

**Diff review (all modes):**

Once changes are complete (by agent, by the user, or both), show the full diff:

```bash
git -C <service_path> diff
```

**[GATE]** Ask the user to confirm the diff is correct and complete.

Do not proceed to Step 7 until the user explicitly approves the diff.

---

### Step 7: Run Tests and Linting

Run the project's test suite and linter using the commands identified in Step 5.
Adapt to the actual project tooling:

```bash
# Node.js / TypeScript example
cd <service_path> && npm install && npm run lint && npm test

# Python example
cd <service_path> && pip install -e ".[dev]" && ruff check . && pytest

# Make-based example
cd <service_path> && make lint test
```

Report the full output to the user.

**If tests or linting fail**:
1. Determine whether the failures are pre-existing by stashing the fix and re-running:
   ```bash
   git -C <service_path> stash
   # re-run tests/lint
   git -C <service_path> stash pop
   ```
2. If pre-existing: inform the user and ask whether to proceed, noting that the PR
   description should document this.
3. If introduced by the fix: do not proceed — return to Step 6.

---

### Step 8: Commit the Fix

Show all changed files:

```bash
git -C <service_path> status
```

**[GATE]** Ask the user which files to include in the commit.

Stage the confirmed files:

```bash
git -C <service_path> add <file1> <file2> ...
```

Craft the commit message following the convention inferred in Step 5:
- Follow the repository's commit style
- Subject line references the bug concisely
- Optional short body (1–3 sentences) explaining why the fix is correct
- No `Co-Authored-By` or AI attribution tags — this is a contribution to an upstream
  open-source project; keep the commit history clean

**[GATE]** Propose the commit message and wait for user confirmation.

Once confirmed:

```bash
git -C <service_path> commit -m "$(cat <<'EOF'
<commit message here>
EOF
)"
```

Verify the commit:

```bash
git -C <service_path> log -1 --oneline
```

---

### Step 9: Push the Branch

```bash
git -C <service_path> push -u origin fix/<slug>
```

Confirm the branch exists on the remote:

```bash
git -C <service_path> ls-remote --heads origin fix/<slug>
```

---

### Step 10: Open the Pull Request

Compose the PR title and body, then present both to the user before creating anything.

**PR title**: derived from the commit subject. Keep it under 72 characters.

**PR body template**:

```markdown
## Summary

- <One-sentence description of the bug>
- <One-sentence description of the fix and why it is correct>

## Changes

- `<file1>`: <what changed and why>
- `<file2>`: <what changed and why> (if applicable)

## Testing

- [ ] Existing tests pass
- [ ] Manual testing performed: <describe what was tested>

## Context

This fix was identified while working on the
[ReLIFE Web UI](https://github.com/ReLIFE-Project-EU/relife-web-ui).
```

**[GATE]** Show the proposed title and body to the user and wait for confirmation.

Once confirmed:

```bash
gh pr create \
  --repo ReLIFE-Project-EU/relife-<service>-service \
  --base <base_branch> \
  --head fix/<slug> \
  --title "<PR title>" \
  --body "$(cat <<'EOF'
<PR body here>
EOF
)"
```

Display the PR URL returned by the command.

---

### Step 11: Post-PR Checklist

Verify and report:

```bash
gh pr view <PR_URL>
gh pr checks <PR_URL>
```

If CI checks are running, note that the user should monitor them.

Summarise the completed workflow:

> Bug fix PR opened: **<PR title>**
> Service: `<service>` — `ReLIFE-Project-EU/relife-<service>-service`
> Branch: `fix/<slug>` → `<base_branch>`
> PR: <PR URL>

---

## Important Constraints

- **Never force-push** to the fix branch after it has been pushed to the remote.
- **Never push directly to `main`** or the base branch.
- **Never commit secrets** (API keys, tokens, `.env` values). Briefly scan staged files
  before committing.
- **Always get user approval** at each [GATE] before proceeding.
- **Do not modify** any files inside the `relife-web-ui` repository as part of this
  workflow.
- If the state is ambiguous or an error occurs, **stop and report** rather than
  attempting silent recovery.

---

## Troubleshooting Reference

| Problem                                    | Resolution                                              |
| ------------------------------------------ | ------------------------------------------------------- |
| `gh auth status` fails                     | Run `gh auth login` and re-authenticate                 |
| Remote URL does not match expected         | Stop; ask user to verify `external-services/` setup     |
| Local uncommitted changes on base branch   | Ask user: stash, discard, or abort                      |
| Tests fail (pre-existing)                  | Document in PR body; ask user whether to proceed        |
| `git push` rejected (non-fast-forward)     | Do not force-push; investigate and ask the user         |
| PR creation fails                          | Check `gh auth status`, verify branch was pushed, retry |
| Branch name conflicts with existing remote | Propose an alternative slug and ask for confirmation    |
