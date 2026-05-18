import type { ReactNode } from 'react'

const noop = () => {}

const identity = <T>(x: T) => x

/**
 * Vanilla `@floating-ui/react` mock: every export is a noop or identity
 * passthrough. Consumers whose components own their open/close state
 * (Menu, DatePicker, CalendarRange, etc.) don't need floating-ui to wire
 * clicks — they manage `aria-expanded` directly.
 *
 * Tests whose component delegates click-to-toggle to floating-ui (e.g.
 * Calendar's inline header picker) keep their own smart-mock locally.
 *
 * Usage:
 *
 *   vi.mock('@floating-ui/react', async () => (await import('../mocks/floating-ui')).default)
 *
 * The dynamic-import indirection works around vi.mock's factory-hoisting
 * limitation while keeping the mock surface in one place.
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
