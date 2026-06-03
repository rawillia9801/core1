# Core Current Build Direction

## Purpose

This is the short steering page for the next Core build work. It exists so future Codex runs stop repeating completed verification tasks and stop drifting into unrelated areas.

## Mandatory Working Repository

All local work must use:

```text
C:/Users/rawil/core1
```

Expected branch and remote:

```text
branch: main
remote: https://github.com/rawillia9801/core1.git
```

Never use:

```text
C:/Users/rawil/OneDrive/Documents/core1
```

## Verified Baseline In The Active Local Workflow

The local owner login has been verified with the mapped local owner profile:

```text
email: robert@test.us
role: owner
status: active
```

The active Core owner/operator workspace includes these verified areas:

- `/staff` protected owner/operator workspace.
- `/staff/command` read-only Core Command Console with upgraded UI, Today’s Briefing, and deterministic Recommended Next Steps when present locally.
- `/staff/proposed-actions` proposal/review foundation.
- `/staff/applications`, `/staff/reservations`, `/staff/payments`, `/staff/go-home`, and `/staff/notifications` existing Core workflow pages.
- `/staff/dogs`, `/staff/litters`, and `/staff/puppies` real kennel record pages with create/edit/archive foundations.
- `/staff/buyers`, `/staff/families`, `/staff/events`, `/staff/phone-lookup`, `/staff/documents`, `/staff/messages`, and `/staff/kennel-logs` route-specific pages.

## Important Remote/Local Warning

The GitHub `main` branch must be treated as the source of truth for Codex tasks. If Codex reports a local commit or workflow that cannot be found on GitHub `main`, the next task must first confirm whether that local work was pushed before documenting or building on top of it.

Do not mark a feature complete in docs unless the corresponding committed code exists in `rawillia9801/core1` on `main` or the user explicitly says the local commit has not been pushed yet.

## Do Not Repeat These As Build Tasks

Do not spend a build task merely verifying that these pages exist:

- `/staff/documents`
- `/staff/messages`
- `/staff/kennel-logs`
- `/staff/events`
- `/staff/phone-lookup`
- `/staff/buyers`
- `/staff/families`
- `/staff/command`

Those checks can be part of a short smoke test after real implementation, but they are not the next build lane.

## Current Safe Build Direction

The next useful Core OS build work should be one of these focused lanes, in this order:

1. **Applications review detail workflow**
   - Add a real `/staff/applications/[applicationId]` detail page.
   - Add internal approve/decline/needs-follow-up review actions only if not already complete in GitHub `main`.
   - Every write must use controlled RPC/server actions and write event/audit rows.
   - No email, SMS, documents, payments, public publishing, portal behavior, or external provider calls.

2. **Proposed Actions usability workflow**
   - If not already present on GitHub `main`, add owner/admin create/approve/reject UI for proposal records only.
   - Approval must still not execute business actions.
   - Add detail view and template presets only after the basic create/approve/reject workflow is confirmed on GitHub `main`.

3. **Internal notes/follow-up workflow**
   - Add internal owner/operator notes tied to applications, buyers/families, puppies, reservations, or proposed actions.
   - Notes must be private Core records only.
   - No customer messages or external sending.

4. **Documents/messages safe workflow expansion**
   - Documents may gain internal metadata-only review actions.
   - Messages may gain internal draft/proposal workflow only.
   - No upload, storage writes, generation, signatures, email/SMS sending, or provider calls.

## Blocked Until Later

The following remain blocked until separate approval and safety gates exist:

- AI provider calls or model integrations.
- Autonomous AI writes.
- Voice command execution.
- Smart home/Home Assistant/device control.
- Camera AI or puppy health inference.
- Live email/SMS sending.
- Payment processor movement.
- Document generation/signature provider workflows.
- Customer portal access.
- Public puppy listing publishing.
- Zoho integrations, imports, sync, or compatibility workflows.

## Codex Prompt Rule

Every build task should start with the path lock and should name exact files or exact route folders. If the task begins to branch into unrelated routes, docs, auth, providers, or UI polish, stop and narrow it before editing.
