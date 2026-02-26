# Apply Database Migration

## Migration File
`supabase/migrations/20240101000001_disable_auth_requirements.sql`

## How to Apply

### Via Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**:
   - Go to: https://supabase.com/dashboard/project/rwhevivopepxuenevcme/sql/new

2. **Copy the Migration SQL**:
   - Open the file: `supabase/migrations/20240101000001_disable_auth_requirements.sql`
   - Copy all the SQL content

3. **Paste and Run**:
   - Paste the SQL into the Supabase SQL editor
   - Click "Run" or press Cmd/Ctrl + Enter
   - Wait for execution to complete

4. **Verify**:
   - Check that all policies were dropped and recreated
   - No errors should appear

## What This Migration Does

- **Drops** all existing user-specific RLS policies
- **Creates** new policies that allow access for the default anonymous user ID: `00000000-0000-0000-0000-000000000000`
- **Enables** full CRUD access for all tables using the default user ID

## After Applying

1. Refresh the app: https://night-divides-the-day.vercel.app
2. Check browser console - Supabase errors should be gone
3. Test creating a task - it should save successfully
4. Test content generation - should work without errors

## Verification

After applying, you should see:
- ✅ No Supabase RLS errors in console
- ✅ Tasks can be created and saved
- ✅ Content cache works
- ✅ All database operations succeed

