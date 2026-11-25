# Return: Umami analytics

Outcome: done. Branch: `seo/umami`; base: `17b882c0d7627b3c7e23396daff0e76665cce37c`. The draft PR for this branch targets main.

The Vite HTML transform adds the owner-supplied deferred Umami script to the shared head during production builds. Nginx serves that entry for every public SPA route. Development servers and non-production build modes exclude analytics. No CSP is configured in the repository.

The owner also requested orch-init. The config, managed agent guidance, documentation index and templates are included. Existing CLAUDE.md guidance is preserved. No ledger was created or edited, and setup is proposed on this branch for PR review. No main push, merge, deployment or PR watch was performed.

Verification:

- `npm run lint`: passed.
- `npm run build`: passed; existing CSS import-order warning remains.
- `npm test`: initial parallel run had three UI failures, including a timeout.
- `npm test -- --maxWorkers=1`: all 190 tests in 36 files passed.
- Parsed built `dist/index.html`: exactly one Umami script in head, defer present, exact source and website ID.
- Resolved development-server config excludes the plugin; staging build hook returns no tags.
- `git diff --check`: passed.
- orch-deslop: reviewed code and prose; no cleanup edits needed.

GBrain lookup initially failed with connection-pool exhaustion; a host diagnosis was healthy and a later lookup succeeded. No relevant project-specific page was used. Durable outcome will be recorded after the PR is opened.

Follow-up: initialise the reserved WIP ledger on main when authorised. Future work follows PR, cross-model review, then merge; configured small-PR automatic merge limit is 50 changed lines. This task explicitly stops at a draft PR.
