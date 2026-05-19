import type { ReactNode } from 'react'

const noop = () => {}

const identity = <T>(x: T) => x

/**
 * Vanilla `@floating-ui/react` mock: every export is a noop or identity
 * passthrough. Applied globally via `setup/module-mocks.ts` so every test
 * file sees the same module shape — per-file mocks can resolve inconsistently
 * in the vmThreads pool when `sequence.shuffle` reorders worker loading,
 * leaving `useFloating` and `useHover` (or vice versa) in mixed states.
 *
 * Tests whose component delegates click-to-toggle to floating-ui (e.g.
 * Calendar's inline header picker) override locally via `vi.mock` in the
 * test file.
 */
const floatingUIMock = {
	autoUpdate: noop,
	FloatingPortal: ({ children }: { children: ReactNode }) => children,
	flip: () => ({}),
	offset: () => ({}),
	shift: () => ({}),
	size: () => ({}),
	safePolygon: () => () => {},
	useClick: () => ({}),
	useClientPoint: () => ({}),
	useDismiss: () => ({}),
	useFocus: () => ({}),
	useHover: () => ({}),
	useFloating: () => ({
		refs: {
			setReference: noop,
			setFloating: noop,
			reference: { current: null },
			floating: { current: null },
		},
		floatingStyles: {},
		context: {},
		x: 0,
		y: 0,
		strategy: 'absolute',
		placement: 'bottom',
		middlewareData: {},
		isPositioned: true,
		update: noop,
	}),
	useInteractions: () => ({
		getReferenceProps: identity,
		getFloatingProps: identity,
		getItemProps: identity,
	}),
	useRole: () => ({}),
}

export default floatingUIMock
