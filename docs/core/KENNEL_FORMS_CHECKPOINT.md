# Core Checkpoint — Kennel Forms

## Completed

- Real record creation functions were added for dogs, litters, and puppies.
- A rollback-safe SQL test passed locally for the dog, litter, and puppy create flow.
- The staff pages now include add forms for:
  - `/staff/dogs/new`
  - `/staff/litters/new`
  - `/staff/puppies/new`
- The Dogs, Litters, and Puppies sidebar links are enabled.
- The forms create real Core records only.
- The forms are owner/admin only.

## Still To Verify In Browser

- Save one dog record.
- Save one litter record.
- Save one puppy record.
- Confirm each saved record appears on its matching staff page.

## Safety Boundary

The kennel forms are internal Core actions only. They do not contact customers, publish public pages, create documents, or connect to outside services.

## Known Cleanup

Remove the unused `unscheduledGoHomes` line from `src/app/staff/go-home/page.tsx`, then run `npm run lint`.
