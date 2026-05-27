#!/usr/bin/env bash
set -euo pipefail

# Local/dev-only helper for testing the guarded Zoho intake endpoint.
# This script uses fake data only and does not connect to Zoho.
#
# Usage:
#   CORE_INTAKE_SECRET=your-local-secret ./scripts/test-local-intake-endpoint.sh
#
ENDPOINT_URL="http://localhost:3000/api/intake/zoho-application"
INTAKE_SECRET="${CORE_INTAKE_SECRET:-local-test-secret-only}"

echo "Endpoint: $ENDPOINT_URL"
echo "Payload: fake local/dev Zoho report-label application data only"
echo

response="$(curl -sS -X POST "$ENDPOINT_URL" \
  -H "Content-Type: application/json" \
  -H "x-core-intake-secret: $INTAKE_SECRET" \
  --data-binary @- <<'JSON'
{
  "Form": "Puppy Application",
  "Southwest Virginia Chihuahua Application ID": "LOCAL-SCRIPT-ENDPOINT-TEST-001",
  "First and Last Name": "Local Script Test Applicant",
  "Email Address": "local.script.applicant@example.invalid",
  "Phone Number": "+1 (276) 555-0501",
  "Street Address": "100 Test Report Lane",
  "City": "Testville",
  "State": "VA",
  "Zip Code": "00000",
  "Preferred Contact Method": "Email",
  "Preferred Coat Type": "No Preference",
  "Preferred Gender": "No Preference",
  "Color Preference": "Gold",
  "Desired Adoption Date": "14-Jul-2028",
  "Interest Type": "Current Puppy",
  "Do You Have Other Pets?": "No",
  "Pet Details": "TEST ONLY pet details.",
  "Owned A Chihuahua Before?": "No",
  "Home Type": "Apartment",
  "Fenced Yard?": "No",
  "Work Status": "Part-Time",
  "Who Cares for Puppy?": "Test caregiver",
  "Children at Home": "2",
  "Payment Preference": "Deposit and remainder due at meet",
  "How Did you Hear about us?": "Referral",
  "Ready to Place Deposit?": "No",
  "Please input any questions that you may have here.": "TEST ONLY applicant question.",
  "Terms and Conditions": "Agreed",
  "Date-Time": "24-May-2026 04:28 AM",
  "Signature": "present-in-source-report",
  "Added Time": "24-May-2026 04:28:28",
  "CRM Status": "New Record - Record added",
  "Referrer Name": null,
  "Task Owner": "contact@example.invalid",
  "Comments": "No Comments"
}
JSON
)"

echo
echo "Response body:"
printf '%s\n' "$response"
