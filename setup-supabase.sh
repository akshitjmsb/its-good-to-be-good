#!/usr/bin/env bash

# Sets up the cloud Supabase workflow for this repo:
#   - verifies CLI + linked project
#   - loads secrets from .env.local (SUPABASE_DB_PASSWORD, etc.)
#   - pushes pending migrations to the linked cloud project
#
# Use `npm run supabase:start` + `npm run supabase:push:local` for the optional
# local Docker fallback.

set -euo pipefail

PROJECT_REF="rwhevivopepxuenevcme"
ENV_FILE=".env.local"

echo "Starting cloud Supabase setup..."

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is not installed."
  echo "Install it from: https://supabase.com/docs/guides/cli"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "${ENV_FILE} not found. Copy .env.example to .env.local and fill it in."
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "./${ENV_FILE}"
set +a

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "SUPABASE_DB_PASSWORD is missing from ${ENV_FILE}."
  echo "Reset it in Supabase dashboard -> Project Settings -> Database, then paste into ${ENV_FILE}."
  exit 1
fi

linked_ref="$(cat supabase/.temp/project-ref 2>/dev/null || true)"
if [[ "${linked_ref}" != "${PROJECT_REF}" ]]; then
  echo "Linking repo to cloud project ${PROJECT_REF}..."
  supabase link --project-ref "${PROJECT_REF}"
fi

echo "Applying pending migrations to the cloud DB..."
supabase db push --linked --yes

echo ""
echo "Cloud Supabase setup complete."
echo "API_URL=https://${PROJECT_REF}.supabase.co"
