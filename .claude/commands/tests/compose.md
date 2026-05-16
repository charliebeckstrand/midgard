# tests:compose

TRIGGER when: the user asks to create, add, write, or scaffold tests for any target in the project — components, primitives, hooks, utilities, modules. Also runs automatically when `/ui:component:compose` finishes creating a new component.

Create tests for a target. Detect the target's package and type first, then apply the patterns that match.

## Arguments

$ARGUMENTS

---

## 0. Load the Manifest

Read `./manifest.json`. If missing, stop and tell the user to run `/repo:manifest` first — never generate the manifest yourself.

Pull these fields:

- `packages[*]` — find the owning package by longest-prefix match on `path`.
- `packages[*].testRunner` — drives imports and assertion syntax. `null` → stop and ask the user whether to scaffold test infrastructure first; if invoked automatically by `/ui:component:compose`, return BLOCK with the missing-runner reason instead of prompting. Never silently add a test runner.
- `packages[*].framework` — drives whether component-testing helpers are imported.
- `packages[*].testLayout` — `sibling` or `mirror`.
- `packages[*].scripts.test` — command to run after writing.
- `packages[*].scripts.check-types` — command to type-check.
- `packageManager` — `<pm>` substitution for run commands.

Read the package's `testHelpersDir` from the manifest. If `null`, fall back to globbing the package source for `test-utils.{ts,tsx}`, `setup.{ts,tsx}`, `helpers.{ts,tsx}`, or `__tests__/helpers/`. If multiple match, prefer the one whose exports include a `render` or `renderHook` wrapper; otherwise use the closest to the source file. Prefer the file's exports over raw library calls.

---

## 1. Decide where the test goes

Per `testLayout`:

- **`sibling`** — `<name>.test.<ext>` next to source (or `.spec.` if the project's convention).
- **`mirror`** — under the package's mirrored test root (typically `src/__tests__/`) at a path reflecting the source path.
- **`null`** — sample 1–2 existing tests in the package and mirror their convention.

Extension:

- Renders JSX → `.test.tsx`.
- Pure modules and hooks → `.test.ts`.

---

## 2. Read the source first

Capture before writing:

- **Components / primitives** — root element tag, stable DOM marker (`data-slot`, `data-part`), prop surface (variants, `className`, `children`, refs, event handlers), context-fallback patterns, polymorphism (`href` / `as`), compound sub-parts.
- **Hooks** — input/output shape, internal state, callbacks, side effects, memoization guarantees, browser APIs read at module load.
- **Utilities / pure modules** — public API, documented edge cases, external dependencies that need mocking.


---

## 3. Detect the test helpers

In parallel:

- **Runner imports** — derived from `testRunner`. Vitest → `import { describe, it, expect, vi } from 'vitest'`. Jest → globals or `@jest/globals`. Bun → `import { describe, it, expect } from 'bun:test'`. Node → `import { describe, it } from 'node:test'` + `import assert from 'node:assert/strict'`.
- **Framework helpers** — when the package has `framework: react` or `next`, use `@testing-library/react`. For pure libraries with no frontend surface, skip them entirely.
- **Project-local helpers** — if any were discovered in section 0, prefer them.
- **Mimic neighbors** — read the sibling test (same folder); if none, the nearest test under the same `components/` or `primitives/` subtree. Match formatting, blank-line discipline, description casing, import grouping.

---

## 4. Apply the patterns

Pick every pattern that applies. Required patterns are flagged.

Examples below use Vitest + React with fabricated identifiers. Where a project-local render helper exists, substitute it for `render`.

### 4.1. Component / primitive patterns

**A. Renders with the expected root marker** (REQUIRED)

```tsx
it('renders with data-slot="widget"', () => {
  const { container } = render(<Widget>content</Widget>)

  const el = container.querySelector('[data-slot="widget"]')

  expect(el).toBeInTheDocument()
  expect(el?.tagName).toBe('DIV')
})
```

If the project doesn't use DOM markers, query by accessible role (`screen.getByRole(...)`) instead.

**B. Merges custom `className`** (REQUIRED)

```tsx
it('merges custom className', () => {
  const { container } = render(<Widget className="custom">content</Widget>)

  expect(container.querySelector('[data-slot="widget"]')?.className).toContain('custom')
})
```

**C. Renders children** (when the component accepts children) — `render(<Widget>Hello</Widget>)`, assert `screen.getByText('Hello')` in document.

**D. Forwards ref** (when using `forwardRef`) — pass a `createRef`, assert `ref.current instanceof HTMLDivElement`.

**E. Polymorphic / `as`** (when element changes by prop) — render with `href`, assert root tag is `A` and `href` attribute matches.

**F. Event forwarding** (when forwarding events) — pass a `vi.fn()` handler, dispatch the event on the root marker, assert `toHaveBeenCalledOnce()`. For input-like components, use `userEvent.type()` with the appropriate role query.

**G. Disabled** (when the component accepts `disabled`) — render with `disabled`, assert root marker is `toBeDisabled()`.

**H. Loading** (when the component accepts `loading`) — render with `loading`, assert root is disabled and `aria-busy="true"`.

**I. HTML attribute pass-through** (when props are spread) — render with `id="x"`, assert root has that attribute.

**J. Compound sub-components** (when the component has sub-parts) — test each sub-part's marker and `className` merge using the same pattern as A and B.

**K. Context-fallback prop resolution** (when a prop resolves explicit → context → default)

Exercise each resolution step. Match against a stable output (class, attribute, computed value) that uniquely identifies the step.

```tsx
it('inherits size from <SizeProvider>', () => {
  const { container } = render(
    <SizeProvider value="lg">
      <Widget>content</Widget>
    </SizeProvider>,
  )

  expect(container.querySelector('[data-slot="widget"]')).toHaveAttribute('data-size', 'lg')
})

it('explicit size prop overrides the provider', () => {
  const { container } = render(
    <SizeProvider value="lg">
      <Widget size="sm">content</Widget>
    </SizeProvider>,
  )

  expect(container.querySelector('[data-slot="widget"]')).toHaveAttribute('data-size', 'sm')
})
```

**L. Wrapper / provider components** (when the target provides context) — test that descendants receive the expected attributes / context. For SVG children, query `getAttribute('class')` rather than `.className` (the latter returns an `SVGAnimatedString`).

---

### 4.2. Hook patterns

**A. Initial value** (REQUIRED)

```ts
it('returns the expected initial value', () => {
  const { result } = renderHook(() => useToggle(false))

  expect(result.current[0]).toBe(false)
})
```

**B. State transitions** (when the hook manages state) — render, call the setter inside `act()`, assert the new state.

**C. Callbacks** (when the hook accepts `onChange` or similar) — pass a `vi.fn()`, trigger the state change, assert called with the expected value.

**D. Side effects** (when the hook interacts with the DOM or browser APIs) — assert the effect is active after render, then `unmount()` and assert cleanup.

**E. Referential stability** (when the hook returns a memoized object) — capture `result.current`, `rerender()` with unchanged inputs, assert `result.current === first`.

**F. Module-level browser-API reads** (when the hook reads browser APIs at module load)

Use dynamic import with the runner's module-reset API:

```ts
it('reads the mocked environment', async () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((q: string) => ({ matches: q.includes('dark'), media: q })),
  })

  vi.resetModules()

  const { usePrefersDark } = await import('../use-prefers-dark')

  const { result } = renderHook(() => usePrefersDark())

  expect(result.current).toBe(true)
})
```

---

### 4.3. Pure-function patterns

For formatters, parsers, validators, helpers.

**A. Happy path** (REQUIRED)

```ts
it('formats a dollar amount with two decimals', () => {
  expect(formatCurrency(12.5, 'USD')).toBe('$12.50')
})
```

**B. Edge cases** — one `it` per behavior. Cover documented edge cases (empty input, falsy values, conflicting inputs, boundary values). Skip cases the function does not promise to handle. Do not bundle unrelated assertions in one `it`.

**C. Throws on invalid input** (when the function throws by contract) — `expect(() => fn(bad)).toThrow(/pattern/i)`.

---

### 4.4. Module patterns with mocking

Apply the smallest mock that isolates the unit under test.

**A. Mock a dependency module**

```ts
vi.mock('../api/client', () => ({
  fetchUser: vi.fn(),
}))
```

**B. Mock `fetch`**

```ts
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('calls the expected endpoint', async () => {
  ;(fetch as Mock).mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })))

  await getUser('42')

  expect(fetch).toHaveBeenCalledWith('/users/42', expect.anything())
})
```

**C. Reset between tests** — when mocks carry state, reset in `beforeEach` (or globally in the project's setup file). Never let mock state leak across tests.

---

## 5. Run the tests

Run only the **freshly-written test file**.

By runner:

- **vitest** — `<pm> --filter=<pkg> exec vitest run <new-test-file>`
- **jest** — `<pm> --filter=<pkg> exec jest <new-test-file>`
- **bun** — `<pm> --filter=<pkg> exec bun test <new-test-file>`
- **node** — `<pm> --filter=<pkg> exec node --test <new-test-file>`

Substitute `<pm>` with `packageManager` and `<pkg>` with the target package's `name`. Pass `<new-test-file>` as a path relative to the package root (the directory containing the package's `package.json`).

If the test fails, fix it and re-run.

## 6. Type-check

If the package declares `scripts.check-types`:

```
<pm> turbo check-types --filter=<pkg>
```

Fix any type error in the test file before continuing.

## 7. TypeScript review

Invoke `/typescript:review` against the new test file before declaring done:

```
/typescript:review <path-to-new-test-file>
```

The test is not done until `/typescript:review` returns PASS. If it returns BLOCK, emit a final message starting with `BLOCK:` (followed by the findings); otherwise emit `PASS`. `/ui:component:compose` reads the first token.

When invoked **from** `/typescript:review` itself (file mode against a freshly-written test), skip this step to avoid recursion — the parent already covers it.

---

## What NOT to test

- **Visual appearance** — no class strings or computed styles. Test behavior. Exception: a single deterministic marker (a `data-*` attribute or class that uniquely identifies a resolved variant) is acceptable when probing prop-resolution order.
- **Internal implementation details** — no internal state variables, private methods, or token literals.
- **Animation timing** — non-deterministic in tests. Mock or skip.
- **Snapshot tests** — only if the project already uses them.
- **Every variant permutation** — verify the system works, not every combination.
- **Third-party library internals** — trust the library; test your usage of it.

---

## Checklist

- [ ] Test file at the correct path for the package's `testLayout`, with the correct extension.
- [ ] Imports scoped to what the file uses; runner and framework helpers match the project's existing patterns.
- [ ] Project-local helpers used when present.
- [ ] Every REQUIRED pattern for the target type included.
- [ ] Every optional pattern whose precondition holds included.
- [ ] Formatting matches neighboring tests.
- [ ] Tests pass for the target package.
- [ ] Types check for the target package.
- [ ] `/typescript:review` returned PASS on the new test file.