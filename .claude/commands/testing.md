# Create Tests

TRIGGER when: the user asks to create, add, write, or scaffold tests for any target in the project — components, primitives, hooks, utilities, modules. Also runs automatically when `/ui:component` finishes creating a new component.

You are creating tests for a target somewhere in the project. Detect the target's package and type first, then apply the patterns that match. The test framework, file layout, and helper conventions vary per project — discover them, then follow what you find.

## Arguments

$ARGUMENTS

---

## 0. Load the Project Profile

Read `.claude/cache/project-profile.json`. If missing or stale, invoke `/discover --quiet` and re-read.

Pull these fields:

- `packages[*]` — find the package owning the target by longest-prefix match on its `path`.
- `packages[*].testRunner` — `vitest` / `jest` / `bun` / `node` / `null`. Drives imports and assertion syntax.
- `packages[*].framework` — `next` / `react` / `library` / `node`. Drives whether component-testing helpers are imported.
- `packages[*].testLayout` — `sibling` (`*.test.*` next to source) or `mirror` (`__tests__/` mirrors source tree).
- `packages[*].testHelpersDir` — path to the project's custom test helpers, if any.
- `packages[*].scripts.test` — the command to run after writing.
- `packages[*].scripts.check-types` (or `typecheck`) — the command to type-check after writing.

**If the chosen package has `testRunner: null`** (no test infrastructure detected), **stop and ask the user** whether to scaffold test infrastructure before continuing. Never silently add a test runner, jsdom, or test scripts to a package that doesn't already use them.

---

## 1. Decide where the test goes

Use `testLayout`:

- **`sibling`** — test lives next to the source as `<name>.test.<ext>` (or `<name>.spec.<ext>` if that's the project's convention).
- **`mirror`** — test lives under the package's mirrored test root (typically `src/__tests__/`) at a path that reflects the source path.
- **`null`** — sample 1–2 existing test files in the package to learn the convention, then mirror it.

Extension rules:

- Tests that render JSX: `.test.tsx`.
- Pure-module and hook tests: `.test.ts`.

---

## 2. Read the source first

Before writing any test, read the target's source thoroughly. Capture:

- **For UI components / primitives** — root element tag, any stable DOM marker (`data-slot`, `data-part`), prop surface (variants, `className`, `children`, refs, event handlers), whether it uses any context-fallback pattern (size inheritance, theming), whether it's polymorphic (accepts `href` / `as`), whether it has compound sub-parts.
- **For hooks** — input/output shape, internal state, callbacks accepted, side effects, memoization guarantees, browser APIs read at module load.
- **For utilities / pure modules** — public API, documented edge cases, external dependencies that would need mocking.

This determines which patterns apply.

---

## 3. Detect the test helpers

In parallel:

- **Test runner imports**: derive from `testRunner`. Examples — `vitest` → `import { describe, it, expect, vi } from 'vitest'`; `jest` → globals or `@jest/globals`; `bun` → `import { describe, it, expect } from 'bun:test'`; `node` → `import { describe, it } from 'node:test'` + `import assert from 'node:assert/strict'`.
- **React testing helpers**: when the target's package has `framework: react` or `next`, use `@testing-library/react` (`render`, `renderHook`, `screen`, `fireEvent`, `userEvent`, `act`, `waitFor`). For pure-library packages without a frontend surface, skip framework helpers entirely.
- **Project-local helpers**: if `testHelpersDir` is set, read its barrel/index. Prefer the project's helpers over the raw library calls — they typically wrap providers, add convenience queries, or pre-configure user events.
- **Existing-test mimicry**: read **one neighboring test** in the package. Match its formatting (tabs vs spaces, blank-line discipline, description casing, import grouping). Consistency is non-negotiable.

---

## 4. Apply the patterns

Pick every pattern that applies to the target type. Required patterns are flagged.

Examples below are written for a Vitest + React stack with fabricated identifiers (`Widget`, `useToggle`, `formatCurrency`). Adapt the runner imports if the project uses Jest, Bun test, or Node test instead. Where the project has its own render helper in `testHelpersDir`, substitute it for `render`.

---

### 4.1. Component / primitive patterns

**A. Renders with the expected root marker** (REQUIRED for every component)

```tsx
it('renders with data-slot="widget"', () => {
  const { container } = render(<Widget>content</Widget>)

  const el = container.querySelector('[data-slot="widget"]')

  expect(el).toBeInTheDocument()
  expect(el?.tagName).toBe('DIV')
})
```

If the project does not use DOM markers, query by accessible role instead (`screen.getByRole('button')`) or by the project's preferred query strategy.

**B. Merges custom `className`** (REQUIRED for every component)

```tsx
it('merges custom className', () => {
  const { container } = render(<Widget className="custom">content</Widget>)

  expect(container.querySelector('[data-slot="widget"]')?.className).toContain('custom')
})
```

**C. Renders children** (when the component accepts children)

```tsx
it('renders children', () => {
  render(<Widget>Hello</Widget>)

  expect(screen.getByText('Hello')).toBeInTheDocument()
})
```

**D. Forwards ref** (when the component uses `forwardRef` or equivalent)

```tsx
it('forwards ref', () => {
  const ref = createRef<HTMLDivElement>()

  render(<Widget ref={ref} />)

  expect(ref.current).toBeInstanceOf(HTMLDivElement)
})
```

**E. Polymorphic / `as` behavior** (when the component changes element by prop)

```tsx
it('renders as a link when href is provided', () => {
  const { container } = render(<Widget href="/path">Link</Widget>)

  const el = container.querySelector('[data-slot="widget"]')

  expect(el?.tagName).toBe('A')
  expect(el).toHaveAttribute('href', '/path')
})
```

**F. Event forwarding** (when the component forwards events)

```tsx
it('forwards click handler', () => {
  const onClick = vi.fn()

  const { container } = render(<Widget onClick={onClick}>Click</Widget>)

  container.querySelector('[data-slot="widget"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

  expect(onClick).toHaveBeenCalledOnce()
})
```

For input-like components, use the framework's user-interaction helper:

```tsx
it('fires onChange when typed into', async () => {
  const onChange = vi.fn()

  render(<TextField onChange={onChange} />)

  await userEvent.type(screen.getByRole('textbox'), 'a')

  expect(onChange).toHaveBeenCalled()
})
```

**G. Disabled state** (when the component accepts `disabled`)

```tsx
it('disables the element when disabled is set', () => {
  const { container } = render(<Widget disabled>content</Widget>)

  expect(container.querySelector('[data-slot="widget"]')).toBeDisabled()
})
```

**H. Loading state** (when the component accepts `loading`)

```tsx
it('sets aria-busy and disables when loading', () => {
  const { container } = render(<Widget loading>content</Widget>)

  const el = container.querySelector('[data-slot="widget"]')

  expect(el).toBeDisabled()
  expect(el).toHaveAttribute('aria-busy', 'true')
})
```

**I. HTML attribute pass-through** (when the component spreads props)

```tsx
it('passes through HTML attributes', () => {
  const { container } = render(<Widget id="x" data-testid="el">content</Widget>)

  expect(container.querySelector('[data-slot="widget"]')).toHaveAttribute('id', 'x')
})
```

**J. Compound sub-components** (when the component has sub-parts)

Test each sub-part's marker and `className` merge:

```tsx
it('renders header with data-slot="widget-header"', () => {
  const { container } = render(
    <Widget>
      <WidgetHeader>Title</WidgetHeader>
    </Widget>,
  )

  expect(container.querySelector('[data-slot="widget-header"]')).toBeInTheDocument()
})
```

**K. Context-fallback prop resolution** (when the component reads a context-provided default)

When a component resolves a prop in the order **explicit → context → default**, exercise each step. Match against a stable output (a class, an attribute, a computed value) that uniquely identifies each step.

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

**L. Wrapper / provider components** (when the target itself provides context)

Test that the wrapper exposes the expected attributes / context to descendants. For SVG children, query `getAttribute('class')` rather than reading `.className` — the latter returns an `SVGAnimatedString`, not a string.

---

### 4.2. Hook patterns

**A. Initial value** (REQUIRED for every hook)

```ts
it('returns the expected initial value', () => {
  const { result } = renderHook(() => useToggle(false))

  expect(result.current[0]).toBe(false)
})
```

**B. State transitions** (when the hook manages state)

```ts
it('toggles state', () => {
  const { result } = renderHook(() => useToggle(false))

  act(() => {
    result.current[1]()
  })

  expect(result.current[0]).toBe(true)
})
```

**C. Callbacks** (when the hook accepts `onChange` or similar)

```ts
it('calls onChange when the value changes', () => {
  const onChange = vi.fn()

  const { result } = renderHook(() => useToggle(false, { onChange }))

  act(() => {
    result.current[1]()
  })

  expect(onChange).toHaveBeenCalledWith(true)
})
```

**D. Side effects** (when the hook interacts with the DOM or browser APIs)

```ts
it('cleans up on unmount', () => {
  const { unmount } = renderHook(() => useResizeObserver(ref))

  expect(resizeObserverIsActive()).toBe(true)

  unmount()

  expect(resizeObserverIsActive()).toBe(false)
})
```

**E. Referential stability** (when the hook returns a memoized object)

```ts
it('returns the same reference across re-renders when inputs do not change', () => {
  const { result, rerender } = renderHook(() => useStableHandlers({ id: 'a' }))

  const first = result.current

  rerender()

  expect(result.current).toBe(first)
})
```

**F. Module-level browser-API reads** (when the hook reads browser APIs at module load)

Use dynamic imports with the runner's module-reset API:

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

**B. Edge cases**

Cover documented edge cases — empty input, falsy values, conflicting inputs, boundary values. **One `it` per behavior**; do not bundle unrelated assertions. Skip cases the function does not promise to handle.

```ts
it('returns "$0.00" for zero', () => {
  expect(formatCurrency(0, 'USD')).toBe('$0.00')
})

it('rounds half-to-even at the second decimal', () => {
  expect(formatCurrency(1.005, 'USD')).toBe('$1.00')
})
```

**C. Throws on invalid input** (when the function throws by contract)

```ts
it('throws when the currency code is unknown', () => {
  expect(() => formatCurrency(1, 'XYZ')).toThrow(/unknown currency/i)
})
```

---

### 4.4. Module patterns with mocking

For modules that depend on external services, the network, or other modules. Apply the smallest mock that isolates the unit under test.

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

**C. Reset mocks between tests**

When mocks carry state, reset them in `beforeEach` (or globally in the project's setup file) — never let one test's mock state leak into another.

---

## 5. Run the tests

Run the package's tests via Turbo:

```
<pm> turbo test --filter=<pkg>
```

Substitute `<pm>` with the `packageManager` from the profile (typically `pnpm`) and `<pkg>` with the target package's `name`.

If any test fails, read the error, fix the test, and re-run. Do not leave failing tests.

## 6. Type-check

If the package declares `scripts.check-types` (or `typecheck`), run it the same way:

```
<pm> turbo check-types --filter=<pkg>
```

Use whichever task name the package declares. Any type error in the test file is a blocking failure — fix it.

---

## What NOT to test

- **Visual appearance** — do not assert specific class strings or computed styles. Test behavior, not styling. Exception: a single deterministic marker (a `data-*` attribute or a class that uniquely identifies a resolved variant) is acceptable when probing prop-resolution order.
- **Internal implementation details** — do not test internal state variables, private methods, or token literals.
- **Animation timing** — motion is almost always non-deterministic in tests. Mock or skip it; do not assert frame-by-frame behavior.
- **Snapshot tests** — only introduce them if the project already uses them.
- **Every variant permutation** — verify the variant system works, not every combination of variant × color × size × tone.
- **Third-party library internals** — trust the library; test your usage of it, not its behavior.

---

## Checklist

- [ ] Test file is at the correct path for the project's `testLayout` (`sibling` or `mirror`), and matches the extension of neighboring tests.
- [ ] Imports are scoped to what the file actually uses; runner and framework helpers match what the project already imports elsewhere.
- [ ] If the project has helpers in `testHelpersDir`, they are used rather than raw library calls.
- [ ] Every applicable pattern from section 4 is included.
- [ ] Formatting (indentation, blank lines, description casing) matches neighboring tests.
- [ ] Tests pass for the target package.
- [ ] Types check for the target package.
