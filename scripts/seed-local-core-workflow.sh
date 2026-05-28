#!/usr/bin/env bash
set -euo pipefail

# Local/dev-only helper. This script does not read .env.local, does not print
# secrets, and does not connect to any live service.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/seed-local-core-workflow.sql"

echo "Seeding local/dev Cherolee Core workflow data"
echo "SQL file: $SQL_FILE"
echo "Target: local Supabase Postgres container supabase_db_core1"
echo "Data: fake LOCAL-* records with example.invalid contact data only"
echo

cat "$SQL_FILE" | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
