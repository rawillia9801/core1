#!/usr/bin/env bash
set -euo pipefail

# Local/staging-safe helper for dry-running one selected application payload
# through Core's existing Zoho-shaped application intake function.
#
# This script:
# - reads a local JSON payload file,
# - calls public.core_ingest_zoho_application(payload, null),
# - runs inside a transaction,
# - rolls back every time,
# - does not read .env.local,
# - does not require service-role keys,
# - does not connect to live Zoho or any external integration.
#
# Usage:
#   ./scripts/dry-run-selected-application-intake.sh path/to/payload.json
#
# Optional local Docker overrides:
#   CORE_DB_CONTAINER=supabase_db_core1
#   CORE_DB_USER=postgres
#   CORE_DB_NAME=postgres

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 path/to/payload.json" >&2
  exit 64
fi

PAYLOAD_FILE="$1"
DB_CONTAINER="${CORE_DB_CONTAINER:-supabase_db_core1}"
DB_USER="${CORE_DB_USER:-postgres}"
DB_NAME="${CORE_DB_NAME:-postgres}"

if [[ ! -f "$PAYLOAD_FILE" ]]; then
  echo "Payload file not found: $PAYLOAD_FILE" >&2
  exit 66
fi

if [[ ! -s "$PAYLOAD_FILE" ]]; then
  echo "Payload file is empty: $PAYLOAD_FILE" >&2
  exit 65
fi

PAYLOAD="$(sed '1s/^\xEF\xBB\xBF//' "$PAYLOAD_FILE")"
DOLLAR_TAG="core_payload_$(date +%s)_$$"

if grep -Fq "\$${DOLLAR_TAG}\$" "$PAYLOAD_FILE"; then
  echo "Payload contains the generated SQL dollar-quote tag. Please rerun the script." >&2
  exit 65
fi

echo "Core selected application intake dry run"
echo "Payload file: $PAYLOAD_FILE"
echo "Database container: $DB_CONTAINER"
echo "Database: $DB_NAME"
echo
echo "DRY RUN ONLY - this transaction will roll back."
echo

cat <<SQL | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1
begin;

with intake_result as (
  select *
  from public.core_ingest_zoho_application(
    \$${DOLLAR_TAG}\$
${PAYLOAD}
\$${DOLLAR_TAG}\$::jsonb,
    null
  )
)
select
  buyer_id,
  family_id,
  application_id,
  application_status,
  section_count,
  event_id,
  audit_log_id
from intake_result;

rollback;

select 'DRY RUN ONLY - ROLLED BACK' as dry_run_status;
SQL
