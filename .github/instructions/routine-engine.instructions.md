---
applyTo: "**/*routine*.*"
---

# Routine Engine Instructions

## Core Behavior
- Routine generation must be inventory-first; do not suggest products/items not in inventory.
- Output must be deterministic (same inventory + profile => same order and same steps).
- Steps must be in a safety-aware order; ordering rules should be managed from a single source in code.

## Conflict & Safety Handling
- Flow must not break when a conflict is detected.
- Add a clear `CAUTION` step to output while keeping the routine usable.
- Safety-driven degradations/changes must be explained using stable reason codes.

## Performance & Limits
- Target runtime: <=3s for normal inputs.
- Avoid unnecessary nested loops; use pre-indexing or map/set where possible.
- Keep output size controlled for large inputs (no unnecessary repetition).

## Implementation Rules
- Keep engine functions pure; resolve I/O dependencies in outer layers.
- Verify dependencies in the relevant package `package.json` before introducing new imports.
- Separate rule data from execution logic (config-driven approach).

## Minimum Test Matrix
- ordering: expected safety order
- conflict resolution: CAUTION step generation
- inventory-first: no out-of-inventory suggestions
- determinism: same input produces same output

## Pre-Flight Checklist (Before Writing Code)
- Confirm inventory-first rule is preserved end-to-end.
- Confirm safety ordering source and precedence are defined.
- Confirm dependencies exist in target package `package.json`.
- Confirm routine output shape remains backward compatible.

## Definition of Done
- Inventory-first behavior is preserved with tests.
- Conflict handling emits explicit `CAUTION` step without breaking flow.
- Determinism is validated with repeat-input assertions.
- Runtime impact is bounded and no obvious O(n^3)-style regressions are introduced.

## Do / Don't Examples
- Do: encode ordering rules in one central map/table.
- Don't: duplicate ordering rules across multiple functions.
- Do: degrade gracefully with reason codes when conflicts are found.
- Don't: drop steps silently or throw on expected conflict cases.
