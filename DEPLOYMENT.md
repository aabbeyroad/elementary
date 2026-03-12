## Deployment Runbook

### 1. Supabase

1. Create a new Supabase project.
2. Open the SQL editor.
3. Run [supabase/schema.sql](/Users/sudongkim/Documents/문서%20-%20Sudong%E1%84%8B%E1%85%B4%20MacBook%C2%A0Pro/elementary/supabase/schema.sql).
4. Copy the project URL and service role key.

### 2. Local verification

1. Copy [.env.example](/Users/sudongkim/Documents/문서%20-%20Sudong%E1%84%8B%E1%85%B4%20MacBook%C2%A0Pro/elementary/.env.example) to `.env.local`.
2. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Run `npm run dev`.
4. Create a household, copy the code, and join it in a second browser.
5. Edit a child or schedule item, press `Sync household`, then press `Refresh household` in the second browser.

### 3. Vercel

1. Import this repository into Vercel.
2. Set framework preset to Next.js if Vercel does not auto-detect it.
3. Add these environment variables to Production and Preview:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy.

### 4. First beta test

1. Start with 2 households, not 10.
2. Ask each household to test:
   - create household
   - join household
   - add child
   - add recurring schedule
   - sync
   - refresh on second device
3. Collect confusion points around:
   - who owns pickup
   - what "sync" means
   - whether the care gap alert feels trustworthy

### 5. Known V1 limits

- No account login yet
- No automatic real-time sync yet
- No edit history or rollback yet
- Household code acts as the temporary access model
