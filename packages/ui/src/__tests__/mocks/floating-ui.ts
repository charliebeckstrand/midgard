import { type ReactNode, type RefObject, useEffect } from 'react'

const noop = () => {}

const identity = <T>(x: T) => x

type MockContext = { open?: boolean; onOpenChange?: (open: boolean) => void }

type MockProps = Record<string, unknown>

type MockInteraction = { reference?: MockProps; floating?: MockProps }

type MockEnabled = { enabled?: boolean }

type MockRoleOptions = MockEnabled & { role?: string }

type MockFocusManagerProps = {
	children: ReactNode
	initialFocus?: RefObject<HTMLElement | null>
}

// Stable id stamped on the floating element by `useRole`, mirrored onto the
// reference's `aria-describedby` while open — enough to assert the tooltip's
// description relationship without a real floating engine.
const FLOATING_ID = 'floating-ui-mock-id'

function MockFloatingFocusManager({ children, initialFocus }: MockFocusManagerProps) {
	useEffect(() => {
		initialFocus?.current?.focus()
	}, [initialFocus])

	return children
}

/**
 * Composes a list of prop bags into one: function-valued keys under the same
 * name are chained (earlier first), other defined values are copied (later
 * wins), and `undefined` values are skipped. Generalizes the previous
 * onClick-only composition so reference/floating handlers and aria attributes
 * from every interaction merge consistently.
 */
function mergeProps(list: (MockProps | undefined)[]): MockProps {
	const out: MockProps = {}

	for (const props of list) {
		if (!props) continue

		for (const [key, value] of Object.entries(props)) {
			if (typeof value === 'function') {
				const prev = out[key] as ((...args: unknown[]) => void) | undefined
				const next = value as (...args: unknown[]) => void

				out[key] = prev
					? (...args: unknown[]) => {
							prev(...args)
							next(...args)
						}
					: next
			} else if (value !== undefined) {
				out[key] = value
			}
		}
	}

	return out
}

/**
 * `@floating-ui/react` mock applied globally via `setup/module-mocks.ts`.
 *
 * Provides just enough behavior for tests:
 *   - `useFloating` exposes `open` and `onOpenChange` on `context` so consumers
 *     of `useClick`/`useFocus` can wire open-on-interaction.
 *   - `useClick` / `useFocus` return reference handlers that *open* the panel
 *     (open-only, not toggle): `userEvent.click` fires focus then click, so a
 *     toggling click would re-close what focus just opened. Dismissal in these
 *     components flows through other paths (overlay signal, outside-press), so
 *     open-only keeps the focus + pointer paths consistent.
 *   - `useRole` is additive but gated on `enabled`: it emits the tooltip
 *     `aria-describedby` (reference, while open) + panel `id`/`role` (floating)
 *     ONLY when `enabled !== false`. Every consumer that passes `role: null`
 *     calls `useRole` with `enabled: false`, so it stays a noop for them and
 *     they keep hand-rolling their own roles — the positioning wrapper is not
 *     stamped with a duplicate role.
 *   - `useInteractions` merges interaction reference/floating prop bags (and
 *     any user-supplied props) via `mergeProps`, chaining handlers.
 *
 * Everything else (positioning, hover, dismiss, portals) is a noop or identity
 * passthrough. Applied globally for module-graph consistency across the
 * vmThreads pool.
 */
const floatingUIMock = {
	autoUpdate: noop,
	FloatingFocusManager: MockFloatingFocusManager,
	FloatingPortal: ({ children }: { children: ReactNode }) => children,
	flip: () => ({}),
	offset: () => ({}),
	shift: () => ({}),
	size: () => ({}),
	safePolygon: () => () => {},
	useClick: (context: MockContext, options?: MockEnabled): MockInteraction =>
		options?.enabled === false
			? {}
			: { reference: { onClick: () => context?.onOpenChange?.(true) } },
	useClientPoint: (): MockInteraction => ({}),
	useDismiss: (): MockInteraction => ({}),
	useFocus: (context: MockContext, options?: MockEnabled): MockInteraction =>
		options?.enabled === false
			? {}
			: { reference: { onFocus: () => context?.onOpenChange?.(true) } },
	useHover: (): MockInteraction => ({}),
	useFloating: (opts: MockContext) => ({
		refs: {
			setReference: noop,
			setFloating: noop,
			reference: { current: null },
			floating: { current: null },
			domReference: { current: null },
		},
		floatingStyles: {},
		context: { open: opts?.open, onOpenChange: opts?.onOpenChange } as MockContext,
		x: 0,
		y: 0,
		strategy: 'absolute',
		placement: 'bottom',
		middlewareData: {},
		isPositioned: true,
		update: noop,
	}),
	useInteractions: (interactions: MockInteraction[] = []) => ({
		getReferenceProps: (userProps: MockProps = {}) =>
			mergeProps([userProps, ...interactions.map((i) => i?.reference)]),
		getFloatingProps: (userProps: MockProps = {}) =>
			mergeProps([userProps, ...interactions.map((i) => i?.floating)]),
		getItemProps: identity,
	}),
	useRole: (context: MockContext, options?: MockRoleOptions): MockInteraction =>
		options?.enabled === false
			? {}
			: {
					reference: { 'aria-describedby': context?.open ? FLOATING_ID : undefined },
					floating: { id: FLOATING_ID, role: options?.role ?? 'tooltip' },
				},
}

export default floatingUIMock
