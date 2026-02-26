# Apply Database Migration for Anonymous Access

## Migration File
`supabase/migrations/20240101000001_disable_auth_requirements.sql`

## How to Apply

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/rwhevivopepxuenevcme/sql/new
2. Copy the contents of `supabase/migrations/20240101000001_disable_auth_requirements.sql`
3. Paste into the SQL editor
4. Click "Run" to execute

### Option 2: Via Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

### What This Migration Does

- Removes user-specific RLS policies
- Creates new policies that allow access for the default anonymous user ID: `00000000-0000-0000-0000-000000000000`
- All tables become accessible with this default user ID
- No authentication required

## After Applying Migration

1. Refresh the app: https://night-divides-the-day.vercel.app
2. The login screen should be gone
3. The app should load directly with all features available

## Verification

After applying the migration, verify:
- App loads without login screen ✅
- Tasks can be created ✅
- Content generates correctly ✅
- Data persists ✅

