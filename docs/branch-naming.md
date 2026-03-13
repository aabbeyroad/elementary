# Branch Naming Guide

Use short, descriptive branch names that make the tool owner and purpose obvious.

## Prefixes

- `codex/`: branches used by Codex
- `claude/`: branches used by Claude

## Format

```text
<tool>/<scope>-<change>
```

Examples:

- `codex/ui-care-coverage`
- `codex/fix-sync-dialog`
- `codex/refactor-household-state`
- `claude/perf-homepage`
- `claude/fix-mobile-tabs`
- `claude/feat-share-code-flow`

## Naming Rules

- Prefer lowercase letters, numbers, and hyphens.
- Keep names under roughly 40 characters after the prefix when possible.
- Use one branch per task.
- Do not reuse an old branch for unrelated work.
- Do not put spaces or vague names like `test`, `work`, or `new`.

## Recommended Categories

- `ui-`: visual or interaction work
- `fix-`: bug fix
- `feat-`: new functionality
- `perf-`: performance change
- `refactor-`: structural cleanup
- `docs-`: documentation only

## Examples For This Project

- `codex/ui-weekly-care-blocks`
- `codex/fix-household-refresh`
- `codex/docs-release-plan`
- `claude/perf-app-shell`
- `claude/fix-modal-stacking`
- `claude/feat-school-planner-v2`
