# Codex Task Runbook

This file lets future prompts stay short.

## Start

Use only `C:\Users\rawil\core1` on `main` with remote `https://github.com/rawillia9801/core1.git`.

Stop if the path, branch, remote, or origin sync state is wrong.

## Docs

Read these first:

- `docs/core/CURRENT_STATUS.md`
- `docs/core/IMPLEMENTATION_CHECKLIST.md`
- `docs/core/CORE_BUILD_ORDER.md`
- `docs/core/CORE_PROJECT_REVIEW_AND_COMPLETION_ESTIMATE.md`
- `docs/core/CHEROLEE_CORE_OS_MANUAL_REFERENCE.md`
- `docs/core/CHEROLEE_CORE_CHAPTER1_REFERENCE.md`

Then read only the docs needed for the task.

## Update docs only after validation

Do not mark work complete until it is implemented and validated.

Use existing docs. Do not create extra steering docs unless requested.

## Validate

Run relevant SQL tests when database behavior changes.

Always run:

- `npm run lint`
- `npm run build`

Browser-check changed UI routes when possible.

## Commit

Commit and push completed work unless told otherwise.

Final state must be clean and aligned with origin/main.

## Final report

Report path, branch, docs read, files changed, tests, lint, build, docs updated, commit, push, and final git status.

## Short task format

```text
Read and follow docs/core/CODEX_TASK_RUNBOOK.md.

Task:
[task name]

Task-specific docs:
- [doc]

Hard limits:
[limits]

Commit and push when complete.
```
