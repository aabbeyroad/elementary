# Frontend Release Plan

This plan turns the audit into an execution sequence with clear scope boundaries. The goal is to move from beta-quality UI to a launch-ready frontend without losing momentum on the product.

## Phase 0: Critical Trust and Correctness

Status: In progress

Completed in this pass:

- Hydration-safe local restore moved to a post-mount path.
- Client-only weekday defaults no longer affect the first render.
- Confirmation dialogs now manage focus and keyboard interactions.
- Tabs now expose tab semantics and keyboard navigation.
- Status feedback is announced through a live region.
- Schedule creation is blocked when no child exists.
- Client and server schedule validation now reject invalid time ranges and overlapping items.
- Care-gap detection now checks dismissal-to-first-event and end-of-day coverage.
- Child deletion now warns when linked schedule items will also be removed.

Remaining before Phase 0 can close:

- Break the main page into smaller components and hooks.
- Add automated tests for the corrected behaviors.
- Revisit the alert model so handoff ownership and actual coverage gaps are visually and logically distinct.

## Phase 1: Interaction Model and Information Architecture

Status: Pending

Scope:

- Split onboarding from steady-state household management.
- Redesign the hero so the primary action is obvious and not crowded by secondary controls.
- Replace the single status banner with field-level errors, toasts, and persistent connection state.
- Improve mobile action ergonomics for sync-heavy flows.
- Normalize language and localization handling.
- Add stronger empty, loading, and failure treatments across panels.

Acceptance criteria:

- First-time setup and repeat household use feel like distinct flows.
- Users can always tell what is local, what is shared, and what action is reversible.
- Important actions remain obvious on small screens.

## Phase 2: Frontend Architecture

Status: Pending

Scope:

- Extract `useHouseholdState`, `useHouseholdSync`, and `useConfirmationDialog`.
- Split the page into view components for today, week, setup, status, and household onboarding.
- Introduce a small design-token layer for spacing, interaction states, and surface hierarchy.

Acceptance criteria:

- No single component owns all app state and rendering.
- Core UI sections are individually testable.
- Styling rules are token-driven rather than hard-coded in many places.

## Phase 3: Release Automation

Status: Pending

Scope:

- Add Vitest and React Testing Library for unit and component coverage.
- Add Playwright end-to-end coverage for the main family planning flows.
- Add axe accessibility checks.
- Add visual regression and Lighthouse budgets in CI.
- Lock the build pipeline to one production-validated bundler path.

Acceptance criteria:

- CI blocks regressions in interaction, accessibility, and rendering.
- Preview and production builds are behaviorally consistent.
- The team has objective quality gates before shipping.

## Recommended Order of Work

1. Finish Phase 0 so product trust is stable.
2. Move to Phase 1 to clarify the UI model users actually experience.
3. Execute Phase 2 so the codebase becomes maintainable before more feature work lands.
4. Finish Phase 3 before final launch sign-off.
