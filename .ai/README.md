# AI Development Workflow

This repository uses two deliberately independent roles. Codex develops and
fixes the implementation; GitHub Copilot tests it and reports findings.

## Step 1 — Codex

Codex reads the task and repository guidance, inspects the relevant code, and
implements the feature using the existing architecture.

## Step 2 — Local validation

Codex runs the project's validation commands:

```bash
npm run typecheck
npm run lint
npm run db:test
npm run build
```

The build may require network access for the project's configured font provider
unless the font is self-hosted. A local network failure must be recorded rather
than hidden.

## Step 3 — Copilot QA

Run the `qa-tester` agent from `.github/agents/qa-tester.md`. Copilot must
inspect the original task, git diff, source, tests, database/security behavior,
and relevant UI states independently. Copilot must not modify production code.

## Step 4 — QA report

Copilot writes or updates:

`.ai/reports/copilot-qa.md`

The report must use the structure in `.github/copilot-instructions.md` and
contain a reproducible issue record for every finding.

## Step 5 — Fix

If the report is `FAIL`, Codex reads the entire report, reproduces each issue,
finds the root cause, fixes the implementation, adds regression coverage when
appropriate, and reruns validation.

## Step 6 — Re-test

Copilot runs the QA process again and updates the same report. Repeat the fix
and re-test cycle until the evidence supports `PASS`.

## Step 7 — Done

A feature is complete only after:

`Copilot QA = PASS`

Human approval remains required before merging or deploying. This workflow does
not auto-merge pull requests, deploy production, alter production code from
QA, disable/delete tests, skip security checks, or handle secrets.
