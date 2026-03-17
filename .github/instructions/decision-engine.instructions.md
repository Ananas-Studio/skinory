---
applyTo: "**/*decision*.*,**/*rules*.*"
---

# Decision Engine Instructions

## Contract
- The engine must be deterministic: the same input must always produce the same output.
- Output values must remain fixed: `BUY | DONT_BUY | CAUTION`.
- Explanations must be limited to 2-3 bullets and include stable `reasonCode` values.

## Data Model
- Evaluate rules from configuration/rule data; do not grow a hard-coded decision tree.
- Rule precedence must be explicit (e.g., block > caution > allow).
- Use fail-safe behavior for missing/invalid data:
  - the system must not crash,
  - return `CAUTION` with an explanatory reason code.

## Implementation Rules
- Use a pure function approach; move external side effects (I/O, time, randomness) outside the decision function.
- Verify dependency availability in the target package `package.json` before adding new imports.
- Keep rule set and evaluator separate: evaluator generic, rules data-driven.

## Recommended Output Shape
- Suggested return shape:
  - `decision`: `BUY | DONT_BUY | CAUTION`
  - `reasons`: `{ code: string; message: string }[]`
  - `matchedRuleIds`: `string[]`

## Minimum Test Matrix
- allergen match -> `DONT_BUY`
- conflict match -> `CAUTION`
- missing ingredients/data -> `CAUTION` (fallback)
- same input twice -> byte-level equal result
- reason code stability -> snapshot or explicit assertion

## Pre-Flight Checklist (Before Writing Code)
- Confirm rule source and evaluator boundaries (data vs execution logic).
- Confirm dependency availability in target package `package.json`.
- Confirm output contract compatibility (`BUY | DONT_BUY | CAUTION`).
- Confirm stable reason code naming before implementation.

## Definition of Done
- Deterministic behavior validated with repeat-input tests.
- Output contract and reason code stability preserved.
- Fail-safe handling for missing/invalid input is covered by tests.
- No hidden side effects inside the decision function.

## Do / Don't Examples
- Do: keep evaluator pure and pass current time/random as explicit inputs when needed.
- Don't: call `Date.now()` or `Math.random()` directly inside decision logic.
- Do: store rules as data and evaluate them generically.
- Don't: add ad-hoc nested `if/else` trees for each new rule.

## Change Control
- Keep diffs minimal and localized to decision/rule modules.
- Any change to reason codes or decision precedence must include test updates.
