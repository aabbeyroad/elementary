# Frontend Release Checklist

This checklist treats the app as a production launch candidate rather than a beta prototype. Items are grouped by severity and reviewed against product trust, accessibility, maintainability, and release readiness.

## P0 Release Blockers

- [x] Make persisted household restore hydration-safe so server and client do not render different first frames.
- [x] Stop using client-only date defaults during the first render path when they can diverge from server output.
- [x] Add keyboard and assistive-technology semantics for tabs.
- [x] Add live status announcements for sync and storage changes.
- [x] Add focus management, focus return, escape handling, and tab trapping for destructive confirmation dialogs.
- [x] Add destructive confirmations for high-risk local deletions.
- [x] Prevent schedule creation when no child profile exists.
- [x] Validate schedule time format and require start time to be earlier than end time.
- [x] Reject overlapping schedule items for the same child and weekday.
- [x] Fix care-gap detection so it checks dismissal-to-first-event coverage and end-of-day coverage after the final item.
- [ ] Separate the core page into smaller view, hook, and dialog units so the UI is testable and maintainable.
- [ ] Add automated regression coverage for care-gap logic, destructive flows, sync prompts, and keyboard navigation.

## P1 High Priority Improvements

- [ ] Replace the single global `statusMessage` channel with distinct system state, transient feedback, and field-level validation errors.
- [ ] Redesign the create/join section so onboarding does not remain visually dominant after a household is connected.
- [ ] Unify product language and localization strategy across Korean and English copy.
- [ ] Rename local-only actions so they clearly distinguish between local save and shared sync.
- [ ] Add explicit empty, loading, syncing, failure, and success states for each major panel.
- [ ] Add `focus-visible`, disabled, invalid, and pressed interaction states across the entire control system.
- [ ] Replace the current alert bucket with clearer categories for care gaps, handoff ownership, and stale shared state.
- [ ] Reduce card density and visual competition so the top task is always obvious on desktop and mobile.
- [ ] Add a mobile-first action pattern for sync and refresh rather than stacking all actions in the hero panel.
- [ ] Harden local persistence with versioning, migration handling, and debounced writes.
- [ ] Add undo or recovery affordances for local deletions beyond a single confirmation dialog.

## P2 Release Hardening

- [ ] Add component tests for tabs, dialogs, form validation, and state hydration.
- [ ] Add Playwright coverage for create, join, local edit, sync, refresh, and destructive change protection.
- [ ] Add accessibility testing with axe to CI.
- [ ] Add visual regression checks for desktop and mobile breakpoints.
- [ ] Add bundle, Lighthouse, and Core Web Vitals budgets to CI.
- [ ] Expand metadata with Open Graph, Twitter cards, theme color, and a stable metadata base.
- [ ] Standardize the build pipeline so local, CI, preview, and production use the same validated bundler path.
- [ ] Extract design tokens for spacing, radius, shadow, motion, state colors, and typography scale.

## Exit Criteria

- [ ] No known P0 issue remains open.
- [ ] Keyboard-only flows succeed for create, join, edit, sync, refresh, and delete.
- [ ] Core user journeys have automated coverage in CI.
- [ ] The app produces consistent output across refreshes, local restore, and shared sync.
- [ ] Release notes and operator guidance match the shipped interaction model.
