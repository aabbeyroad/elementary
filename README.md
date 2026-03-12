## Elementary Care Planner

Shared care planning for working parents with early elementary kids.

### What V1 does

- Shows `Today` and `This week` views for one household
- Highlights pickup responsibility and care gaps
- Lets a household create a share code for beta testing
- Stores data locally first, then syncs it to Supabase when connected

## Local development

Install dependencies and run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase setup for shared households

1. Create a Supabase project.
2. In the Supabase SQL editor, run [supabase/schema.sql](/Users/sudongkim/Documents/문서%20-%20Sudong%E1%84%8B%E1%85%B4%20MacBook%C2%A0Pro/elementary/supabase/schema.sql).
3. Copy [.env.example](/Users/sudongkim/Documents/문서%20-%20Sudong%E1%84%8B%E1%85%B4%20MacBook%C2%A0Pro/elementary/.env.example) to `.env.local`.
4. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Restart the dev server.

Once those variables exist, the app can:

- create a household and return a 6-character share code
- join an existing household with the code
- sync child profiles and schedule items to shared storage

## Beta launch checklist

1. Put the two Supabase keys into `.env.local`.
2. Run `npm run dev` and verify you can create a household.
3. Copy the share code into a second browser or private window and join it.
4. Change a schedule item in one window, press `Sync household`, then confirm the second window can pull the same state by joining again.
5. In the second window, use `Refresh household` to pull the latest synced state without rejoining.
6. Deploy to Vercel and add the same environment variables there.

For a cleaner operator checklist, use [DEPLOYMENT.md](/Users/sudongkim/Documents/문서%20-%20Sudong%E1%84%8B%E1%85%B4%20MacBook%C2%A0Pro/elementary/DEPLOYMENT.md).

## Product behavior right now

- The app is intentionally household-first, not account-first.
- Changes are local until `Sync household` is pressed.
- This is safer for a small beta because it avoids silent overwrites while we do not yet have conflict history.

## Notes for beta

- Shared sync is intentional, not automatic. Parents edit locally and press `Sync household`.
- This keeps collaboration predictable before proper account login and conflict handling are added.
- Next step after this beta is lightweight authentication and per-user audit history.
