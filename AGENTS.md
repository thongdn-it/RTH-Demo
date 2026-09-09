<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AI Development + Independent QA

Codex is the **PRIMARY DEVELOPER AGENT** for this repository. GitHub Copilot is
the **INDEPENDENT QA / TEST AGENT**. The two roles must remain independent:
Codex implements and fixes production code; Copilot looks for problems and
reports them. Human review and merge are always required.

## Repository facts

- Application root: this directory (`sources/RTH-Demo` in the containing workspace).
- Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Supabase, and PGlite.
- Package manager: **npm**, identified by `package-lock.json`; do not switch package managers.
- Validation: `npm run typecheck`, `npm run lint`, `npm run db:test`, and `npm run build`.
- E2E framework: none is configured; report E2E as `NOT AVAILABLE` unless one is added deliberately.
- Next.js proxy entry point: `src/proxy.ts`.
- AI configuration: `AGENTS.md`, `.github/copilot-instructions.md`, `.github/agents/qa-tester.agent.md`, `.ai/`, and `.github/workflows/`.

## Codex responsibilities

- Understand the requirement and inspect the existing code before changing it.
- Reuse existing components, utilities, conventions, and architecture.
- Implement production code and write or update automated tests.
- Run validation, review the final git diff, and fix bugs reported by QA.

## Codex workflow

1. Understand the task and inspect the relevant source, documentation, and tests.
2. Plan the smallest implementation that follows the existing architecture.
3. Implement the feature and add or update tests.
4. Run typecheck, lint, relevant unit/integration tests, and build when appropriate.
5. Review the git diff and consider the local implementation complete only after validation passes.
6. Commit the completed implementation on the working branch.
7. Push the branch and open or update a pull request.
8. Wait for independent Copilot QA before treating the feature as done.

The current project commands are:

```bash
npm run typecheck
npm run lint
npm run db:test
npm run build
```

Run commands from this directory. Do not assume `npm` for another repository;
re-inspect the lockfile if the repository layout changes.

Do not weaken or delete tests, remove validation, hide errors, or treat
compilation alone as proof of correctness. Do not blindly follow a QA
suggestion: reproduce the finding, determine its root cause, and then choose
the correct fix. Add a regression test for a confirmed bug when appropriate.

## Handling the Copilot QA report

When `.ai/reports/copilot-qa.md` exists, or when Copilot posts a QA review or
comment on the pull request, read the complete feedback. Reproduce every issue,
determine its root cause, fix production code as needed, add regression
coverage where appropriate, and rerun the relevant tests, typecheck, lint, and
build when appropriate. Review the final diff afterward.

If QA reports `FAIL`, Codex must fix and push an update so the QA workflow runs
again. Codex must not blindly apply suggestions, weaken/delete tests, disable
validation, or ignore HIGH/CRITICAL findings.

## Project-specific rules

- This is Next.js 16 App Router with TypeScript, npm, ESLint, Supabase, and PGlite authorization tests.
- Follow the existing `docs/ai-rules.md`, `docs/architecture.md`, `docs/database.md`, and `docs/testing.md`.
- Read the relevant Next.js guidance under `node_modules/next/dist/docs/` before changing Next.js code.
- Treat authentication, authorization, RLS, ownership, input validation, storage access, and sensitive data exposure as security-critical.
- `src/proxy.ts` is the Next.js proxy entry point; do not recreate a middleware architecture.
- Do not use service-role credentials in application code or commit credentials and `.env` files.
- Do not create production deploy steps, production environment steps, merge
  automation, or auto-approval automation in this workflow.

## Definition of Done

A feature is complete only when requirements are satisfied, typecheck/lint and
relevant tests pass, the Copilot QA check is `PASS`, and no known `CRITICAL` or
`HIGH` issue remains. Human approval is still required before merge or deployment.
