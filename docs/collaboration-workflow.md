# Collaboration Workflow

This repository is set up so Claude and Codex can work in parallel without overwriting each other or accidentally shipping unfinished work.

## Branch Roles

- `main`: production-only branch
- `claude/*`: Claude work branches
- `codex/*`: Codex work branches

Only `main` should trigger production deployment in Vercel.

## Deployment Model

- Pushes to `main` create Production deployments.
- Pushes to `claude/*` create Preview deployments.
- Pushes to `codex/*` create Preview deployments.

## Rules We Follow

- Do not commit directly on `main`.
- Do not let Claude and Codex share the same working branch.
- Always create a new work branch from the latest `main`.
- Merge to `main` only after preview validation.
- Keep each branch focused on a single feature or fix.

## Starting Codex Work

```bash
git checkout main
git pull origin main
git checkout -b codex/feature-name
git push -u origin codex/feature-name
```

If continuing an existing Codex branch:

```bash
git checkout codex/feature-name
git pull origin codex/feature-name
```

## Starting Claude Work

```bash
git checkout main
git pull origin main
git checkout -b claude/feature-name
git push -u origin claude/feature-name
```

If continuing an existing Claude branch:

```bash
git checkout claude/feature-name
git pull origin claude/feature-name
```

## Shipping a Change

1. Finish work on a `claude/*` or `codex/*` branch.
2. Push the branch and review the Vercel Preview deployment.
3. Open a pull request targeting `main`.
4. Merge only after review and validation.
5. Let Vercel deploy `main` to Production.

## Recommended Safety Checks Before Merge

- `npm run check`
- verify the matching Preview deployment
- confirm there are no unintended working tree changes
- confirm the PR target is `main`

## Current Project Setup

- GitHub default branch: `main`
- Vercel production branch: `main`
- Codex base working branch: `codex/initial-beta`
- Claude base working branch from earlier work: `claude/parent-school-planning-app-2DZTP`
