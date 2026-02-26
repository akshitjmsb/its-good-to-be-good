# Vercel Environment Variables Status

## ✅ Configured

### Perplexity API
- ✅ `VITE_PERPLEXITY_API_KEY` - Added to Production, Preview, Development
- Value: `your_perplexity_api_key_here`

### Legacy (Can be removed)
- ⚠️ `VITE_GEMINI_API_KEY` - Old API key (no longer used)
- ⚠️ `GEMINI_API_KEY` - Old API key (no longer used)

## ⚠️ Missing - Supabase Credentials

You need to add these to Vercel:

```bash
# Get these from: https://supabase.com/dashboard → Your Project → Settings → API

# Add Supabase URL
npx vercel env add VITE_SUPABASE_URL production
npx vercel env add VITE_SUPABASE_URL preview
npx vercel env add VITE_SUPABASE_URL development

# Add Supabase Anon Key
npx vercel env add VITE_SUPABASE_ANON_KEY production
npx vercel env add VITE_SUPABASE_ANON_KEY preview
npx vercel env add VITE_SUPABASE_ANON_KEY development
```

## Cleanup (Optional)

Remove old Gemini keys:
```bash
npx vercel env rm VITE_GEMINI_API_KEY production
npx vercel env rm VITE_GEMINI_API_KEY preview
npx vercel env rm VITE_GEMINI_API_KEY development

npx vercel env rm GEMINI_API_KEY production
npx vercel env rm GEMINI_API_KEY preview
```

## View All Environment Variables

```bash
npm run vercel:env:ls
# or
npx vercel env ls
```

## Pull Environment Variables Locally

```bash
npm run vercel:env:pull
# or
npx vercel env pull .env.local
```

This will update your `.env.local` file with all Vercel environment variables.

