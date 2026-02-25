#!/usr/bin/env bash

set -euo pipefail

echo "Starting local Supabase setup..."

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is not installed."
  echo "Install it from: https://supabase.com/docs/guides/cli"
  exit 1
fi

echo "Ensuring local Supabase services are running..."
supabase start

echo "Applying local migrations..."
supabase db push --local

status_json="$(supabase status --output json)"
api_url="$(printf '%s' "$status_json" | sed -n 's/.*"API_URL": *"\([^"]*\)".*/\1/p')"
publishable_key="$(printf '%s' "$status_json" | sed -n 's/.*"PUBLISHABLE_KEY": *"\([^"]*\)".*/\1/p')"

echo ""
echo "Local Supabase setup complete."
echo "API_URL=${api_url}"
echo "PUBLISHABLE_KEY=${publishable_key}"
echo ""
echo "Set your frontend env values in .env.local:"
echo "VITE_SUPABASE_URL=${api_url}"
echo "VITE_SUPABASE_ANON_KEY=${publishable_key}"
