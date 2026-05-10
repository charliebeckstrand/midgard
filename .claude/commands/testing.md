# Create Tests

TRIGGER when: the user asks to create, add, write, or scaffold tests for a target anywhere in this monorepo — components, primitives, hooks, utilities, modules — in `packages/`, or any app under `apps/`. Also runs automatically when `/ui-component` finishes creating a new component.

You are creating tests for a target somewhere in this monorepo. Detect the target's package and type first, then apply the patterns that match. Follow the conventions, formatting, and rules below exactly.

## Arguments

$ARGUMENTS

---

## Test infrastructure

**Framework:** Vitest. The only package currently configured for tests is `packages/ui` — it uses jsdom, globals enabled, and ships custom helpers. Other packages (`heimdall`, `sindri`, apps) have no test infrastructure yet.

**`packages/ui` specifics:**

- **Config:** `packages/ui/vitest.config.ts`
- **Setup:** `src/__tests__/setup.ts` — mocks `motion/react`, stubs `matchMedia` and `ResizeObserver`, runs `cleanup()` after each test.
- **Custom helpers** (`src/__tests__/helpers.tsx`):
	- **`renderUI(ui, options?)`** — renders with optional context wrappers (`skeleton`, `glass`, `inputSize`)
	- **`bySlot(container, name)`** — queries a single element by its `data-slot` attribute
	- **`allBySlot(container, name)`** — queries all elements by `data-slot`
	- Re-exports: `screen`, `fireEvent`, `userEvent`, `act`, `waitFor`, `within` from testing-library

**Other packages:** if the target lives outside `packages/ui` and the package has no `vitest.config.*`, **stop and ask the user** whether to scaffold test infrastructure before continuing. Do not silently add vitest, jsdom, or test scripts to a package that doesn't already use them.

---

## File placement

| Target type | Source location | Test file |
|-------------|-----------------|-----------|
| UI component | `packages/ui/src/components/<name>/` | `packages/ui/src/__tests__/components/<name>.test.tsx` |
| UI primitive | `packages/ui/src/primitives/<name>.tsx` | `packages/ui/src/__tests__/primitives/<name>.test.tsx` |
| UI hook | `packages/ui/src/hooks/<name>.ts` | `packages/ui/src/__tests__/hooks/<name>.test.ts` |
| UI core utility | `packages/ui/src/core/<name>.ts` | `packages/ui/src/__tests__/core/<name>.test.ts` |
| UI recipe | `packages/ui/src/recipes/<tier>/<name>.ts` | `packages/ui/src/__tests__/recipes/<name>.test.ts` |
| Non-UI utility / module | `packages/<pkg>/src/<path>.ts` or `apps/<app>/<path>.ts` | co-located `<path>.test.ts` (or `.test.tsx` if it renders JSX) |
| Non-UI hook | `packages/<pkg>/src/<path>.ts` | co-located `<path>.test.ts` |

**Rules:**

- In `packages/ui`, tests mirror the source tree under `src/__tests__/`. Do not co-locate tests with source files in `packages/ui`.
- Outside `packages/ui`, co-locate `*.test.ts(x)` next to the source file — there is no `__tests__/` convention to follow.
- Hook tests use `.test.ts` (no JSX). Component / primitive / JSX-rendering tests use `.test.tsx`.

---

## Step-by-step instructions

### 0. Read the source (REQUIRED — do this first)

Before writing any test, read the target's source code thoroughly. Understand:

- **For components / primitives:** what element it renders and its `data-slot` value; what props it accepts (variants, className, children, ref, event handlers); whether it uses `forwardRef`; whether it supports skeleton mode (`useSkeleton()` / `Placeholder`); whether it supports glass mode (`useGlass()`); whether it is polymorphic (accepts `href` and renders as a link); whether it has sub-components (compound component).
- **For hooks:** the input/output shape, whether it manages state, accepts callbacks, has side effects, returns memoized values, or reads browser APIs at module load.
- **For utilities / modules:** the public API, edge cases the function handles, and any external dependencies that need mocking.

This determines which test patterns apply.

### 1. Determine the target

Parse `$ARGUMENTS` to identify:

- **The target name** (e.g., `button`, `use-controllable`, `cn`, `fetch`)
- **The target type** — UI component, UI primitive, UI hook, UI core utility, UI recipe, non-UI utility/module, or non-UI hook
- **The package** — `packages/`, or an app under `apps/`

If ambiguous, scan the source directories to locate the target.

### 2. Write the test file

Create the test file at the correct path per the file placement table.

Follow these **formatting rules exactly** — consistency with existing tests is non-negotiable:

- Import `describe`, `expect`, `it` (and `vi` only if mocking) from `vitest`
- Import the target via a relative path from the test file
- In `packages/ui` tests, import helpers from `../helpers` — use `renderUI` and `bySlot` (never raw `render` or manual `querySelector` for `data-slot`)
- For hooks, import `renderHook` (and `act` if needed) from `@testing-library/react`
- Use **tabs** for indentation
- Use **blank lines** between logical sections within each `it` block (setup, action, assertion)
- Keep test descriptions **lowercase**, concise, and behavior-focused
- No trailing comments or JSDoc in test files
- No unnecessary imports — only import what each test file actually uses

### 3. Apply the correct test patterns

Pick the patterns that apply to the target. Every applicable pattern **must** be included.

---

#### Component test patterns (UI)

**A. Renders with correct data-slot** (REQUIRED for every component)

```tsx
it('renders with data-slot="<name>"', () => {
	const { container } = renderUI(<<Name>>content</<Name>>)

	const el = bySlot(container, '<name>')

	expect(el).toBeInTheDocument()

	expect(el?.tagName).toBe('<EXPECTED_TAG>')
})
```

**B. Applies custom className** (REQUIRED for every component)

```tsx
it('applies custom className', () => {
	const { container } = renderUI(<<Name> className="custom">content</<Name>>)

	const el = bySlot(container, '<name>')

	expect(el?.className).toContain('custom')
})
```

**C. Renders children** (when the component accepts children)

```tsx
it('renders children', () => {
	renderUI(<<Name>>Hello</<Name>>)

	expect(screen.getByText('Hello')).toBeInTheDocument()
})
```

**D. Forwards ref** (when the component uses forwardRef)

```tsx
it('forwards ref', () => {
	const ref = createRef<HTMLElement>()

	const { container } = renderUI(<<Name> ref={ref} />)

	expect(ref.current).toBeInstanceOf(HTML<Element>Element)

	expect(ref.current).toBe(bySlot(container, '<name>'))
})
```

**E. Polymorphic link behavior** (when the component accepts href)

```tsx
it('renders as a link when href is provided', () => {
	const { container } = renderUI(<<Name> href="/path">Link</<Name>>)

	const el = bySlot(container, '<name>')

	expect(el).toBeInTheDocument()

	expect(el?.tagName).toBe('A')

	expect(el).toHaveAttribute('href', '/path')
})
```

**F. Skeleton mode** (when the component calls useSkeleton)

```tsx
it('renders a placeholder in skeleton mode', () => {
	const { container } = renderUI(<<Name>>content</<Name>>, { skeleton: true })

	expect(bySlot(container, '<name>')).not.toBeInTheDocument()
	expect(bySlot(container, 'placeholder')).toBeInTheDocument()
})
```

**G. Event handlers** (when the component forwards events)

```tsx
it('forwards click handler', async () => {
	const onClick = vi.fn()

	const { container } = renderUI(<<Name> onClick={onClick}>Click</<Name>>)

	const el = bySlot(container, '<name>')

	el?.click()

	expect(onClick).toHaveBeenCalledOnce()
})
```

For input-like components, use `userEvent.setup()`:

```tsx
it('fires onChange handler', async () => {
	const onChange = vi.fn()

	const { container } = renderUI(<<Name> onChange={onChange} />)

	const el = bySlot(container, '<name>') as HTMLInputElement

	const user = userEvent.setup()

	await user.type(el, 'a')

	expect(onChange).toHaveBeenCalled()
})
```

**H. Disabled state** (when the component accepts disabled)

```tsx
it('disables the element when disabled prop is set', () => {
	const { container } = renderUI(<<Name> disabled>content</<Name>>)

	const el = bySlot(container, '<name>')

	expect(el).toBeDisabled()
})
```

**I. Loading state** (when the component accepts loading)

```tsx
it('disables and sets aria-busy when loading', () => {
	const { container } = renderUI(<<Name> loading>content</<Name>>)

	const el = bySlot(container, '<name>')

	expect(el).toBeDisabled()

	expect(el).toHaveAttribute('aria-busy', 'true')
})
```

**J. HTML attribute pass-through** (when the component spreads props)

```tsx
it('passes through HTML attributes', () => {
	const { container } = renderUI(<<Name> id="test" data-testid="el">content</<Name>>)

	const el = bySlot(container, '<name>')

	expect(el).toHaveAttribute('id', 'test')
})
```

**K. Compound sub-components** (when the component has sub-components)

Test each sub-component's data-slot and className forwarding:

```tsx
it('renders <SubName> with data-slot="<sub-name>"', () => {
	const { container } = renderUI(
		<<Name>>
			<<SubName>>content</<SubName>>
		</<Name>>,
	)

	expect(bySlot(container, '<sub-name>')).toBeInTheDocument()
})
```

**L. Size resolution** (when the component has a `size` prop and reads `useConcentric()`)

Components like Button / Checkbox / Radio default their `size` from
`useConcentric()`. Cover the resolution order: explicit prop, then
`<Concentric>` / `<Attached>` inheritance, then the kata default. Match
against a class the kata uniquely emits at each step (e.g. `text-sm/5`
for sm, `text-base/6` for md, `text-lg/7` for lg via `ji.size`).

```tsx
import { Concentric } from '../../components/concentric'

it('inherits size from <Concentric>', () => {
	const { container } = renderUI(
		<Concentric size="lg">
			<<Name>>content</<Name>>
		</Concentric>,
	)

	expect(bySlot(container, '<name>')?.className).toContain('text-lg/7')
})

it('explicit size overrides Concentric inheritance', () => {
	const { container } = renderUI(
		<Concentric size="lg">
			<<Name> size="sm">content</<Name>>
		</Concentric>,
	)

	expect(bySlot(container, '<name>')?.className).toContain('text-sm/5')
})
```

**M. Concentric / Attached wrappers** (when testing a wrapper itself)

Both wrappers stamp `data-step` on their root and provide a context
context descendants can read. SVG children expose `.className` as an
`SVGAnimatedString`, not a string — use `getAttribute('class')` for
those assertions.

```tsx
it('reflects the size prop on data-step', () => {
	const { container } = renderUI(<Concentric size="lg">content</Concentric>)

	expect(bySlot(container, 'concentric')).toHaveAttribute('data-step', 'lg')
})
```

---

#### Primitive test patterns (UI)

Primitives follow the same patterns as components (A through J), but import from `../../primitives` instead:

```tsx
import { <PrimitiveName> } from '../../primitives'
```

---

#### Hook test patterns

These apply to any hook — UI or otherwise. In `packages/ui`, hook tests live under `src/__tests__/hooks/`; elsewhere, co-locate them next to the source.

**A. Initial state** (REQUIRED for every hook)

```ts
it('returns the expected initial value', () => {
	const { result } = renderHook(() => <useHookName>(<args>))

	expect(result.current).toBe(<expected>)
})
```

**B. State updates** (when the hook manages state)

```ts
it('updates state correctly', () => {
	const { result } = renderHook(() => <useHookName>(<args>))

	act(() => {
		result.current[1](<newValue>)
	})

	expect(result.current[0]).toBe(<newValue>)
})
```

**C. Callbacks** (when the hook accepts onChange or similar)

```ts
it('calls onChange when value changes', () => {
	const onChange = vi.fn()

	const { result } = renderHook(() => <useHookName>({ onChange }))

	act(() => {
		result.current[1]('new')
	})

	expect(onChange).toHaveBeenCalledWith('new')
})
```

**D. Side effects** (when the hook interacts with the DOM or browser APIs)

```ts
it('cleans up on unmount', () => {
	const { unmount } = renderHook(() => <useHookName>(<args>))

	// Assert side effect is active
	expect(<sideEffect>).toBe(<active>)

	unmount()

	// Assert side effect is cleaned up
	expect(<sideEffect>).toBe(<inactive>)
})
```

**E. Referential stability** (when the hook returns memoized values)

```ts
it('returns a referentially stable object across re-renders', () => {
	const { result, rerender } = renderHook(() => <useHookName>(<args>))

	const first = result.current

	rerender()

	expect(result.current).toBe(first)
})
```

**F. Module-level mocking** (when the hook reads browser APIs at module level)

Use dynamic imports with `vi.resetModules()`:

```ts
it('handles the mocked environment', async () => {
	// Set up the mock
	Object.defineProperty(window, '<api>', {
		writable: true,
		value: vi.fn().mockImplementation(() => <mockReturn>),
	})

	vi.resetModules()

	const { <useHookName> } = await import('../../hooks/<hook-name>')

	const { result } = renderHook(() => <useHookName>())

	expect(result.current).toBe(<expected>)
})
```

---

#### Utility / pure-function patterns

For pure functions (formatters, parsers, helpers, recipe builders, `cn`-style utilities). Existing examples: `packages/ui/src/__tests__/core/cn.test.ts`, `packages/ui/src/__tests__/recipes/sun.test.ts`.

**A. Happy path** (REQUIRED)

```ts
it('<does the expected thing for typical input>', () => {
	const result = <fn>(<input>)

	expect(result).toBe(<expected>)
})
```

**B. Edge cases**

Cover the documented edge cases the function actually handles — empty input, falsy values, conflicting inputs, boundary values. One `it` per behavior; do not bundle unrelated assertions. Skip cases the function does not promise to handle.

```ts
it('returns <result> for empty input', () => {
	expect(<fn>()).toBe(<expected>)
})

it('handles <conflict / boundary case>', () => {
	expect(<fn>(<input>)).toBe(<expected>)
})
```

**C. Throws on invalid input** (when the function throws by contract)

```ts
it('throws when <invalid condition>', () => {
	expect(() => <fn>(<bad input>)).toThrow(<message or matcher>)
})
```

---

#### Module patterns (with mocking)

For modules that depend on external services, environment, network, or other modules — common in `heimdall`, `sindri`, and apps. Apply the smallest mock that isolates the unit under test.

**A. Mock a dependency module**

```ts
import { vi } from 'vitest'

vi.mock('<module-path>', () => ({
	<exportName>: vi.fn(),
}))
```

**B. Mock `fetch` / network**

```ts
import { afterEach, beforeEach, expect, it, vi, type Mock } from 'vitest'

beforeEach(() => {
	vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
	vi.unstubAllGlobals()
})

it('calls fetch with the expected URL', async () => {
	;(fetch as Mock).mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })))

	await <fn>()

	expect(fetch).toHaveBeenCalledWith('<expected-url>', expect.anything())
})
```

**C. Reset mocks between tests**

When mocks are stateful, reset them in `beforeEach` (or use `vi.resetAllMocks()` in `setup.ts`) — never let one test's mock state leak into another.

### 4. Verify

Run the tests for the target package:

| Package | Command (run from repo root) |
|---------|------------------------------|
| `packages/ui` | `pnpm --filter ui test` |
| `packages/heimdall` | `pnpm --filter heimdall test` |
| `packages/sindri` | `pnpm --filter sindri test` |
| `apps/<app>` | `pnpm --filter <app> test` |

If any test fails, read the error, fix the test, and re-run. Do not leave failing tests.

### 5. Type-check

Verify the test file has no type errors:

```bash
pnpm turbo check-types --filter=<package>
```

---

## What NOT to test

- **Visual appearance** — do not assert specific Tailwind classes or computed styles. Test behavior, not styling. (UI exception: `data-slot`, `className` merge, and size-resolution checks that intentionally probe a single deterministic class.)
- **Internal implementation details** — do not test internal state variables, private methods, or recipe token values.
- **Animation behavior** — motion is mocked in the `packages/ui` test setup. Do not test animation timing or motion props.
- **Snapshot tests** — this codebase does not use snapshot testing. Do not introduce them.
- **Every variant permutation** — test that the variant system works (className contains expected class), not every combination of variant × color × size.
- **Third-party library internals** — trust the library; test your usage, not its behavior.

---

## Checklist

Before finishing, verify:
- [ ] Test file is at the correct path per the file placement table (mirrored under `src/__tests__/` for `packages/ui`; co-located elsewhere)
- [ ] File extension matches target type (`.test.tsx` for components/primitives/JSX-rendering tests, `.test.ts` for hooks and pure modules)
- [ ] In `packages/ui`, imports use `renderUI` and `bySlot` from helpers (not raw `render` or manual `querySelector`)
- [ ] Every applicable pattern from Step 3 is included
- [ ] Formatting matches existing tests: tabs, blank lines between sections, lowercase descriptions
- [ ] No unused imports
- [ ] Tests pass for the target package (`pnpm --filter <package> test`)
- [ ] Types check (`pnpm turbo check-types --filter=<package>`)
