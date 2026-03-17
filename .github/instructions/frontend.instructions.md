---
applyTo: "apps/web/**/*.{ts,tsx},apps/landing/**/*.{ts,tsx},apps/e2e/**/*.{ts,tsx},packages/ui/**/*.{ts,tsx},packages/core/**/*.ts"
---

# Frontend Instructions (Repo-Specific)

This monorepo contains multiple frontend targets. Copilot must use the correct stack based on file location.

## Path-to-Stack Matrix (Mandatory)
- `apps/landing/**` -> Next.js App Router (`next`, `react`, `react-dom`)
- `apps/web/**` -> Vite + React (`vite`, `react`, `react-dom`)
- `packages/ui/**` -> Shared UI primitives only (shadcn-style patterns)
- `packages/core/**` -> Framework-agnostic TypeScript only
- `apps/e2e/**` -> Cypress test code only

## Global Rules (All Frontend Packages)
- Import only dependencies declared in the target package.
- Prefer workspace imports (`@skinory/ui`, `@skinory/core`) when using code from another package.
- Do not mix framework APIs:
	- Do not use Vite APIs inside `apps/landing`.
	- Do not use Next.js APIs (`next/*`) inside `apps/web`.
- Keep lint/format style consistent with the existing file (quotes, semicolons, import order).

## apps/landing (Next.js 16 + React 19, App Router)
- Default to Server Components; add `"use client"` only when required.
- Use `next/link` for navigation and `next/image` for images.
- Browser-only APIs (`window`, `document`, `localStorage`) must only be used in client components.
- Handle loading and error states explicitly in data fetching flows.
- Build/lint commands: `pnpm --filter landing build`, `pnpm --filter landing lint`.

## apps/web (Vite 7 + React 19)
- Use standard React client component patterns.
- Do not use Next.js-specific imports or server component patterns.
- Prefer simple local state patterns; avoid unnecessary abstractions.
- Build/lint commands: `pnpm --filter web build`, `pnpm --filter web lint`.

## packages/ui (@skinory/ui)
- This package is shadcn-based: `class-variance-authority`, `clsx`, `tailwind-merge`, `radix-ui`, `lucide-react`.
- Preserve existing patterns when adding new UI primitives (`cn`, variant structure, accessibility attributes).
- Do not introduce non-React dependencies or new UI frameworks.
- Keep exports aligned with the `exports` field in `package.json`.
- Validation commands: `pnpm --filter @skinory/ui lint`, `pnpm --filter @skinory/ui typecheck`.

## packages/core (@skinory/core)
- Write framework-agnostic TypeScript (do not add React/DOM dependencies).
- Keep small, pure, testable helpers and business rules here.
- Expose public API changes only through `src/index.ts`.

## apps/e2e (Cypress 14)
- Add test files only to the matching folder:
	- web: `apps/e2e/cypress/web/**/*.cy.ts`
	- landing: `apps/e2e/cypress/landing/**/*.cy.ts`
- Avoid flaky tests; use visible-state assertions instead of fixed waits.
- E2E commands:
	- `pnpm e2e:web`
	- `pnpm e2e:landing`

## Dependency Gate (Mandatory)
- Check the target package `package.json` before generating code.
- If a dependency is missing:
	1) do not write the import,
	2) propose or apply dependency installation first,
	3) then generate the code.

## Pre-Flight Checklist (Before Writing Code)
- Confirm target path and package scope.
- Confirm all imports exist in the target package dependencies.
- Reuse existing patterns/components before introducing new structures.
- Keep change size minimal and focused on requested behavior.

## Definition of Done
- Scope-correct implementation (no cross-framework API misuse).
- No unrelated refactors or style-only churn.
- Relevant checks pass for touched package(s):
	- `lint`
	- `typecheck` (if available)
	- `build` when behavior depends on bundling/runtime integration

## Do / Don't Examples
- Do: use `next/image` in `apps/landing`; don't use plain image optimization workarounds there.
- Do: use standard React patterns in `apps/web`; don't import from `next/*`.
- Do: add Cypress specs under matching project folder; don't place web specs under landing folder.
- Do: reuse `@skinory/ui` primitives; don't add a second UI component library.

## E2E Stability Rules
- Prefer robust selectors (`data-*` when available) over brittle CSS/text-only selectors.
- Never use fixed waits (e.g., `cy.wait(1000)`) when a state/assertion can be awaited.
- Keep tests deterministic: no dependence on shared mutable state across tests.
