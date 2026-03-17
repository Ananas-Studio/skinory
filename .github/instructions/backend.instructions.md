---
applyTo: "apps/api/**/*.ts,server/**/*.ts,api/**/*.ts"
---

# Backend (Node/TS) Instructions

There is currently no active backend package in this monorepo (the `apps/api` folder does not exist).
This file exists to prevent Copilot from making incorrect technology assumptions when a backend is added.

## Scope & Dependency Safety
- Use only dependencies declared in the target package's `package.json`.
- Do not directly import libraries that are not installed (`zod`, `sequelize`, `redis`, etc.).
- If a new dependency is required, update `package.json` and the lockfile first, then write code.
- The repo default is TypeScript + ESM; do not mix in CommonJS patterns.

## API Contract
- Validate input at the HTTP boundary; choose the validation method based on available dependencies.
- Keep error responses in a single format:
	- `{ ok: false, error: { code: string, message: string, details?: unknown } }`
- Keep successful responses in a consistent envelope:
	- `{ ok: true, data: ... }`
- Error codes must be deterministic; the same condition must return the same `code`.

## Route Contract & Validation Controls
- Every route must define and enforce an explicit request contract (body, params, query, headers when relevant).
- Every route must define a stable response contract for both success and failure payloads.
- Boundary validation failures must return deterministic `4xx` errors with a stable `code` and actionable `details`.
- Do not pass raw `req.body`, `req.params`, or `req.query` into service logic without validation/parsing.
- Route handlers must keep transport-level checks in controller/route layer and pass normalized data into services.
- Contract checks should be present per route to keep API communication predictable and safe across clients.

## Architecture
- Keep handlers/controllers thin; move domain logic into service functions.
- Separate I/O concerns (DB, HTTP, cache) from pure business logic.
- Centralize access to time, randomness, and environment variables to improve testability.

## Data & Reliability
- Ensure atomicity in multi-step write operations (transaction or idempotent compensation strategy).
- Keep timeout, retry, and error logging behavior explicit and bounded.
- Never log sensitive data (tokens, passwords, personal data).

## Testing Expectations
- Add unit tests for critical flows:
	- happy path
	- validation failure
	- dependency/infrastructure failure
- Mock time/random dependencies in deterministic logic.

## Pre-Flight Checklist (Before Writing Code)
- Confirm target backend package/path and runtime assumptions.
- Confirm dependencies exist in target package `package.json`.
- Confirm request/response contract expectations before modifying handlers.
- Confirm whether change requires data migration or backward compatibility handling.

## Definition of Done
- Boundary validation and deterministic error envelope are preserved.
- Business logic remains separated from transport and I/O concerns.
- Critical path tests pass for success and failure modes.
- No sensitive data is exposed in logs, errors, or telemetry.

## Do / Don't Examples
- Do: return stable error codes for known failure classes.
- Don't: leak raw dependency errors directly to API clients.
- Do: keep handlers thin and move logic to services.
- Don't: mix DB/HTTP calls deeply inside validation/parsing code.

## Change Control
- Keep diffs focused and avoid unrelated structural refactors.
- If public contract changes, update tests and any API documentation in the same change.
