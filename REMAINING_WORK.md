# Remaining work

This file tracks deferred acceptance items. It does not downgrade any requirement
in `PROJECT_SPEC.md`.

## Phase 4 — Gemini credential connection

- Call the Gemini provider with a user-supplied key and normalize provider errors.
- Consume a successful, user-bound pending record only after explicit save
  confirmation; activate, replace, revoke, and delete credential records.
- Enforce persisted rate limits and test key replacement without breaking the
  currently active credential.
- Run the controlled real-provider smoke test when a Gemini key is available.

## Future phase gates

- Phase 5: application CRUD, job analysis, deterministic relevance ranking, and
  user source selection.
- Phase 6: structured generation, Truth Guard, semantic verification, and
  evaluation fixtures.
- Phase 7: revision editor, autosave, undo/redo, source inspector, and diffs.
- Phase 8: authorized Chromium PDF rendering with flexible page counts,
  server-side layout checks, and export records.
- Phase 9: deployment, monitoring, deletion flows, security review, and staging
  rehearsal.

## External verification required

- Controlled Gemini API test needs a user-provided Gemini key.
- Production PDF renderer and staging rehearsal need deployed Supabase/Vercel
  environment credentials.
