# Add Supabase Anon Key to Vercel

## Current Status

✅ **Supabase URL Added**: `https://rwhevivopepxuenevcme.supabase.co`
- Added to Production, Preview, Development

⚠️ **Anon Key Needed**: You need to add `VITE_SUPABASE_ANON_KEY`

## How to Get Your Anon Key

1. Go to: https://supabase.com/dashboard/project/rwhevivopepxuenevcme/settings/api
2. Under "Project API keys", find the **anon/public** key (starts with `eyJ...`)
3. Copy the key

## Add to Vercel

Once you have the anon key, run:

```bash
# Replace YOUR_ANON_KEY with the actual key
echo "YOUR_ANON_KEY" | npx vercel env add VITE_SUPABASE_ANON_KEY production
echo "YOUR_ANON_KEY" | npx vercel env add VITE_SUPABASE_ANON_KEY preview
echo "YOUR_ANON_KEY" | npx vercel env add VITE_SUPABASE_ANON_KEY development
```

Or use the interactive method:
```bash
npx vercel env add VITE_SUPABASE_ANON_KEY production
# Paste the key when prompted
```

## Quick Command (After Getting Key)

If you have the key, I can add it for you. Just provide the anon key and I'll run the commands.

