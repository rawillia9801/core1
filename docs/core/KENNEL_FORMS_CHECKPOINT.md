# Core Checkpoint — Kennel Forms
## Status Note

- Current as of this pass: historical checkpoint/reference.
- Reflects the completed kennel forms checkpoint and remains useful as a local verification record; ongoing current truth lives in the central steering docs.
- Central current truth: `CURRENT_STATUS.md` and `IMPLEMENTATION_CHECKLIST.md`.


## Completed

- Real record creation functions were added for dogs, litters, and puppies.
- A rollback-safe SQL test passed locally for the dog, litter, and puppy create flow.
- The existing technical `/staff` pages now include add forms for:
  - `/staff/dogs/new`
  - `/staff/litters/new`
  - `/staff/puppies/new`
- The Dogs, Litters, and Puppies sidebar links are enabled.
- The forms create real Core records only.
- The forms are owner/admin only.
- Add buttons are visible on:
  - `/staff/dogs`
  - `/staff/litters`
  - `/staff/puppies`
- Edit links are visible on dog, litter, and puppy record cards.
- Edit/archive pages exist for:
  - `/staff/dogs/[dogId]/edit`
  - `/staff/litters/[litterId]/edit`
  - `/staff/puppies/[puppyId]/edit`
- The known unused `unscheduledGoHomes` variable was removed from `src/app/staff/go-home/page.tsx`.
- The kennel record loop was browser-tested by the owner:
  - Add dog.
  - Add litter.
  - Add puppy.
  - View saved records on their matching owner/operator pages.
  - Access edit paths from record cards.

## Audited Update / Archive Layer

The edit/archive layer was moved behind controlled database RPCs:

- `core_update_dog(...)`
- `core_archive_dog(...)`
- `core_update_litter(...)`
- `core_archive_litter(...)`
- `core_update_puppy(...)`
- `core_archive_puppy(...)`

A rollback-safe SQL test passed locally for the audited update/archive flow.

Verified results:

- `dog_update_check = 1`
- `dog_archive_check = 1`
- `litter_archive_check = 1`
- `puppy_archive_check = 1`
- `event_check = 6`
- `audit_check = 6`
- `ROLLBACK`

## Neonatal Command Follow-Up

- `/staff/litters` now includes an internal Neonatal Litter Command workflow.
- The workflow reads existing litter, dog, puppy, puppy event, and observed weight rows only.
- It shows today's born litter panel, upcoming expected litters, newborn puppy cards, weight/growth readiness, 24-72 hour owner reminder tasks, and deterministic watch/risk signals.
- It does not diagnose puppies, replace veterinary care, publish puppies, message customers, update the portal, call external providers, connect devices/cameras, add dependencies, or add migrations.
- `/staff/litters` now includes an internal Expected Litters & Whelping Prep workflow.
- Expected Litters & Whelping Prep reads existing dog, litter, puppy, weight, and puppy event metadata only.
- It shows planned/expected litter summaries, expected birth date countdowns where stored, missing setup/data quality flags, owner/operator prep reminders, and recently born transition flags.
- It does not diagnose pregnancy or puppies, predict medical outcomes, publish puppies, message customers, update the portal, connect smart-home/cameras/devices, call external providers, add dependencies, or add migrations.
- The current schema does not store a pregnancy-status field, so Core does not infer pregnant dams; expected/due-date planning uses only existing litter expected birth date and status fields.
- Daily Weight & Care Log was added inside `/staff/litters`.
- `core_record_puppy_weight_log(...)` records factual puppy weight observations in grams.
- `core_record_puppy_care_observation(...)` records factual neonatal care observations using allowed observation types.
- The weight/care log workflow writes event/audit rows and remains internal owner/operator observation logging only. It does not diagnose puppies, message customers, publish puppies, update the portal, connect smart-home/cameras/devices, call external providers, add AI, generate documents, or process payments.
- Individual Puppy Detail / Neonatal Growth Timeline was added at `/staff/puppies/[puppyId]`.
- The puppy timeline uses existing puppy, litter, dam/sire, weight, care observation, event, and safely linkable audit data only.
- The puppy timeline is internal owner/operator observation review only. It does not diagnose puppies, message customers, publish puppies, update the portal, connect smart-home/cameras/devices, call external providers, add AI, generate documents, or process payments.
- Kennel Daily Task Board / Today's Care Checklist was added to `/staff`.
- The daily task board derives owner/operator tasks from existing Core puppy, litter, weight, care, go-home, reservation, payment, document, notification, dog, and kennel metadata.
- The daily task board is internal task visibility only. It does not diagnose puppies, message customers, publish puppies, process payments, generate documents, update the portal, connect smart-home/cameras/devices, call external providers, or add AI.
- Breeding Dog Profile was added at `/staff/dogs/[dogId]`.
- `/staff/dogs` now links each dog to its internal profile with an Open profile link while preserving the existing add/edit/archive loop.
- The dog profile supports internal dog health history / medical event tracking through `core_dog_health_events` and `core_record_dog_health_event(...)`.
- Registry, acquisition, genetic testing, pedigree, and certification metadata support was added through controlled `core_dogs.metadata` updates.
- Dog Document Vault / Genetic Reports / Certificates metadata support was added through `core_dog_documents` and `core_record_dog_document_metadata(...)`.
- Dam/sire litter history shows linked litters, puppies, and buyer/reservation context where existing Core data links those records.
- Dog Document Upload / Private Storage Attachment workflow was added for dog document metadata records.
- Dog document storage uses the private `dog-documents` Supabase storage bucket only.
- Private dog document upload is owner/admin only, validates allowed files up to 10 MB, updates metadata through `core_attach_dog_document_file_metadata(...)`, and writes event/audit rows.
- Dog/Puppy Media Upload Foundation was added for internal private photo metadata.
- Dog and puppy photo storage uses the private `kennel-media` Supabase storage bucket only.
- Private dog/puppy photo upload is owner/admin only, validates JPG/PNG/WEBP files up to 10 MB, records metadata through `core_record_kennel_media_metadata(...)`, uses signed internal previews, hides raw storage paths, and writes event/audit rows.
- The dog/puppy media foundation does not publish puppies, expose public media URLs, message customers, update a portal, connect smart-home/cameras/devices, add AI, process payments, generate documents, or call external providers.
- The dog profile and document vault are internal owner/operator recordkeeping only. They do not diagnose animals, message customers, publish puppies, generate documents, expose public document links, connect smart-home/cameras/devices, or call external providers.
- Production puppy weight/care and kennel media action handling was hardened so missing configuration, RPC failures, and storage failures redirect to safe error states instead of crashing page renders.
- Temporary production repair placeholder files are absent; kennel actions remain in the canonical action files.

## Obsolete Tests Removed

The two earlier broken/obsolete kennel create tests were removed so future test runs are clearer:

- `supabase/tests/core_kennel_create_records_tests.sql`
- `supabase/tests/core_kennel_create_records_fixed_tests.sql`

The valid create test remains:

- `supabase/tests/core_kennel_create_records_v2_tests.sql`

The valid update/archive test is:

- `supabase/tests/core_kennel_update_archive_records_tests.sql`

## Still To Verify Locally

- Run `npm run lint` after pulling the go-home cleanup commit if it has not already been rerun.
- Verify archive-style actions only mark records inactive/archived/hidden and do not hard-delete linked history.

## Safety Boundary

The kennel forms are internal Core actions only. They do not contact customers, publish public pages, create documents, move payments, or connect to outside services.

Archive-style delete behavior is intentionally non-destructive:

- Dog delete marks the dog `inactive`.
- Litter delete marks the litter `archived`.
- Puppy delete marks the puppy `unavailable` and `hidden`.

## Next Ordered Step

Move to the next Core-native owner/operator workspace: Buyers / Families.

This workspace should remain read-first and real-data-only before adding controlled write tools.

Do not move to public website publishing, customer emails, documents, payments, or AI write autonomy until each owner/operator workflow has the same safety boundary, audit trail, and browser verification path.
