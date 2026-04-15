# Create UI Tests

TRIGGER when: the user asks to create, add, write, or scaffold tests for a component, primitive, or hook in `packages/ui` — or when the `/ui-component` skill finishes creating a new component.

You are creating tests for a UI target (component, primitive, or hook) inside `packages/ui`. Follow the conventions, patterns, and formatting described below exactly.

## Arguments

$ARGUMENTS

---

## Test infrastructure

**Framework:** Vitest with jsdom environment, globals enabled.

**Config:** `packages/ui/vitest.config.ts`

**Setup:** `src/__tests__/setup.ts` — mocks `motion/react`, stubs `matchMedia` and `ResizeObserver`, runs `cleanup()` after each test.

**Custom helpers** (`src/__tests__/helpers.tsx`):
- **`renderUI(ui, options?)`** — renders with optional context wrappers (`skeleton`, `glass`, `inputSize`)
- **`bySlot(container, name)`** — queries a single element by its `data-slot` attribute
- **`allBySlot(container, name)`** — queries all elements by `data-slot`
- Re-exports: `screen`, `fireEvent`, `userEvent`, `act`, `waitFor`, `within` from testing-library

---

## File placement

| Target type | Source location | Test file |
|-------------|----------------|-----------|
| Component | `src/components/<name>/` | `src/__tests__/components/<name>.test.tsx` |
| Primitive | `src/primitives/<name>.tsx` | `src/__tests__/primitives/<name>.test.tsx` |
| Hook | `src/hooks/<name>.ts` | `src/__tests__/hooks/<name>.test.ts` |

Note: hook tests use `.test.ts` (no JSX). Component and primitive tests use `.test.tsx`.

---

## Step-by-step instructions

### 0. Read the source (REQUIRED — do this first)

Before writing any test, read the target's source code thoroughly. Understand:

- What element it renders and what `data-slot` value it uses
- What props it accepts (variants, className, children, ref, event handlers)
- Whether it uses `forwardRef`
- Whether it supports skeleton mode (`useSkeleton()` / `Placeholder`)
- Whether it supports glass mode (`useGlass()`)
- Whether it is polymorphic (accepts `href` and renders as a link)
- Whether it has sub-components (compound component)
- Whether it is a hook (uses `renderHook` pattern instead of `renderUI`)

This determines which test patterns apply.

### 1. Determine the target type

Parse `$ARGUMENTS` to identify:

- **The target name** (e.g., "button", "use-controllable", "form-control")
- **The target type** — component, primitive, or hook

If ambiguous, scan the source directories to locate the target.

### 2. Write the test file

Create the test file at the correct path per the file placement table above.

Follow these **formatting rules exactly** — consistency with existing tests is non-negotiable:

- Import `describe`, `expect`, `it` (and `vi` only if mocking) from `vitest`
- Import the target from its source using relative paths (`../../components/<name>`, `../../primitives`, `../../hooks/<name>`)
- Import helpers from `../helpers` — use `renderUI` and `bySlot` (never raw `render` or manual `querySelector` for `data-slot`)
- For hooks, import `renderHook` (and `act` if needed) from `@testing-library/react`
- Use **tabs** for indentation
- Use **blank lines** between logical sections within each `it` block (setup, action, assertion)
- Keep test descriptions **lowercase**, concise, and behavior-focused
- No trailing comments or JSDoc in test files
- No unnecessary imports — only import what each test file actually uses

### 3. Apply the correct test patterns

Pick the patterns that apply to the target. Every applicable pattern **must** be included.

---

#### Component test patterns

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

---

#### Primitive test patterns

Primitives follow the same patterns as components (A through J), but import from `../../primitives` instead:

```tsx
import { <PrimitiveName> } from '../../primitives'
```

---

#### Hook test patterns

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

### 4. Verify

Run the tests from the `packages/ui` directory:

```bash
pnpm test
```

If any test fails, read the error, fix the test, and re-run. Do not leave failing tests.

### 5. Type-check

Verify the test file has no type errors:

```bash
pnpm turbo check-types --filter=ui
```

---

## What NOT to test

- **Visual appearance** — do not assert specific Tailwind classes or computed styles. Test behavior, not styling.
- **Internal implementation details** — do not test internal state variables, private methods, or recipe token values.
- **Animation behavior** — motion is mocked in the test setup. Do not test animation timing or motion props.
- **Snapshot tests** — this codebase does not use snapshot testing. Do not introduce them.
- **Every variant permutation** — test that the variant system works (className contains expected class), not every combination of variant × color × size.

---

## Checklist

Before finishing, verify:
- [ ] Test file is at the correct path (`src/__tests__/components/`, `src/__tests__/hooks/`, or `src/__tests__/primitives/`)
- [ ] File extension matches target type (`.test.tsx` for components/primitives, `.test.ts` for hooks)
- [ ] Imports use `renderUI` and `bySlot` from helpers (not raw `render` or manual `querySelector`)
- [ ] Every applicable pattern from Step 3 is included
- [ ] Formatting matches existing tests: tabs, blank lines between sections, lowercase descriptions
- [ ] No unused imports
- [ ] Tests pass: `pnpm test` from `packages/ui`
- [ ] Types check: `pnpm turbo check-types --filter=ui`
