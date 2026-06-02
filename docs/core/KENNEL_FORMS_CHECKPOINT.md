# Core Checkpoint — Kennel Forms

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
