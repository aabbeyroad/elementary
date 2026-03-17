# Elementary — Claude Code Project Guide

## Project Overview

Elementary is a Korean family planning web app built with Next.js 15 and Supabase. It helps households manage children's schedules, detect care gaps, and coordinate pickup responsibilities between parents.

## Tech Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4 with a custom Apple-inspired design system
- **Backend**: Supabase (Postgres, Auth, Realtime)
- **UI Components**: Custom component library in `src/components/ui/`
- **Validation**: Zod
- **Date handling**: date-fns with Korean locale

## Development Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

## Environment Setup

Copy `.env.local.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `NEXT_PUBLIC_APP_URL` — App URL (default: http://localhost:3000)
- `NAVER_SEARCH_CLIENT_ID` / `NAVER_SEARCH_CLIENT_SECRET` — Naver local search API

## Directory Structure

```
src/
  app/
    (app)/           # Authenticated app routes (layout with AppShell)
      dashboard/     # Daily schedule view (default landing)
      schedule/      # Weekly + monthly schedule views
      children/      # Child profile management
      supplies/      # School supply tracking
      settings/      # Household settings
      onboarding/    # First-time household setup
    api/
      households/    # CRUD for household data
      naver/         # Naver local search proxy
    auth/callback/   # Supabase OAuth callback
    login/           # Login / email auth
  components/
    dashboard/       # DashboardContent (daily view entry point)
    layout/          # AppShell, BottomNav, AppSessionProvider
    schedule/        # DailyView, WeeklyViewPage, MonthlyViewPage, ScheduleForm, DateNavigator
    ui/              # Design system: Button, Card, Input, Select, PageHeader, etc.
  hooks/
    useSchedules.ts      # Fetches and manages schedules + children + parents
    useRealtimeSync.ts   # Supabase realtime subscription
    useModalDialog.ts    # Modal state helper
  lib/
    types.ts             # Core domain types (ChildProfile, ScheduleItem, etc.)
    validation.ts        # Zod schemas for schedule validation
    utils/
      care-gaps.ts       # Care-gap detection algorithm
      schedule-helpers.ts  # resolveSchedulesForDate
    server/
      household-repo.ts  # Server-side household DB queries
      supabase-admin.ts  # Supabase admin client
    supabase/            # Client/server/middleware Supabase helpers
  types/
    database.ts          # Supabase-generated DB types + app types
  middleware.ts          # Supabase session refresh middleware
supabase/                # Supabase migrations and config
```

## Key Domain Concepts

- **Household**: The top-level entity. Each family has one household with an access code for sharing.
- **ChildProfile**: A child with grade, school, and default dismissal time.
- **ScheduleItem**: A recurring weekly schedule event (school, academy, pickup, etc.) for a child.
- **Override**: A one-off date-specific change to a recurring schedule item.
- **ParentRole**: `"Mom" | "Dad" | "Grandma" | "Academy Bus" | "TBD"` — who handles pickup.
- **Care gap**: A time window where no adult is assigned to a child (detected in `care-gaps.ts`).

## Architecture Notes

- All pages under `src/app/(app)/` require authentication — the `AppShell` layout handles session checks.
- `useSchedules` is the primary data hook — it fetches schedules, overrides, children, and parents in one call.
- Schedule validation (time overlap, invalid ranges) lives in `src/lib/validation.ts` and runs both client- and server-side.
- The design system tokens are defined in the global CSS and follow an Apple-style design language (documented in `docs/design-system.md`).

## Current Development Status

See `docs/release-checklist.md` for full status. Remaining P0 blockers:
- Break `DashboardContent` and the main schedule page into smaller view, hook, and dialog components.
- Add automated regression tests for care-gap logic, destructive flows, sync prompts, and keyboard navigation.

## Coding Conventions

- Use `'use client'` only where needed (interactive components).
- Server components fetch data via `src/lib/server/` helpers.
- All user-facing Korean strings use Korean characters directly (no i18n library).
- Prefer `useCallback` and `useMemo` for stable references passed to child components.
- Use `startTransition` for non-urgent state updates (e.g., date navigation).
- New UI should use existing design tokens (`surface-card`, `page-shell`, etc.) rather than raw Tailwind values.

## Git Workflow

- `main` → production (Vercel)
- `claude/*` → Claude work branches (Vercel preview)
- `codex/*` → Codex work branches (Vercel preview)
- Never commit directly to `main`.
- See `docs/collaboration.md` for the full workflow.
