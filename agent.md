# Sueldo Simple: Agent Guide

## Workflow

Use Spec Driven Development: read the specification, update it before changing
behavior, implement the plan, verify acceptance criteria, then update tasks and
verification evidence. Preserve user changes. Ask about conflicting financial
rules instead of silently changing them.

## Constraints

- HTML, CSS and vanilla JavaScript only. No npm, framework, CDN or build step.
- `index.html` and `tests.html` must work when opened directly from disk.
- Spanish UI, mobile first, accessible keyboard controls, Chilean peso symbol `$`.
- Store each month independently. Never silently discard malformed saved data.
- Use integer pesos and reject invalid monetary values before calculating/exporting.
- Follow SOLID through small components with single responsibilities and injected
  calendar, calculation, storage, view and print dependencies. Avoid needless classes.
- Read `specs/001-sueldo/spec.md`, `plan.md` and `tasks.md` before implementation.
- Every financial rule needs an observable acceptance test.
- Run `node tests.js`; verify real browser behavior, responsive layout and print.
- Keep documentation and evidence consistent with the delivered code.

## Structure

`app.js` contains reusable domain services and browser orchestration. It exports
the domain API to Node for the dependency-free tests and to the browser for the UI.
`styles.css` includes responsive and print layouts. `tests.js` is shared by Node
and `tests.html`. `README.md` contains launch and verification instructions.
