'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import {
	type BreakpointFrameContextValue,
	useBreakpointFrame,
} from '../primitives/breakpoint-frame/context'
import { matchesMediaQuery, subscribeMediaQuery } from '../utilities/media-query'
import {
	BREAKPOINT_WIDTHS,
	BREAKPOINTS,
	type Breakpoint,
	type MinBreakpoint,
	type Responsive,
	valueAt,
} from '../utilities/responsive'

const query = (bp: MinBreakpoint) => `(min-width: ${BREAKPOINT_WIDTHS[bp]})`

/** The breakpoints that `value` names, largest first, without the unprefixed base. */
function namedBreakpoints<T>(value: Responsive<T>): MinBreakpoint[] {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return []

	const named: Partial<Record<Breakpoint, T>> = value

	return BREAKPOINTS.filter(
		(bp): bp is MinBreakpoint => bp !== 'initial' && named[bp] !== undefined,
	).reverse()
}

/**
 * The value that a responsive prop holds at the viewport now. It is the
 * JavaScript twin of the classes that `resolveVariant` gives for the same
 * value, so a component that must act on its layout (an arrow-key axis, an
 * `aria-orientation`, a motion) reads the same answer as its CSS.
 *
 * In a breakpoint frame, such as the frame of an example in the docs, the
 * hook reads the width of the frame in place of the viewport. A surface that
 * a portal moves out of the frame reads the viewport.
 *
 * The hook watches only the breakpoints that the value names, and a change
 * across another breakpoint does not render the component again. During SSR
 * each breakpoint matches, as with `useMediaQuery`, so the server takes the
 * value of the largest breakpoint.
 *
 * @param value - The single or per-breakpoint value.
 * @param fallback - The value below the first breakpoint that the map names.
 * @returns The value in force at the viewport.
 *
 * @example
 * const orientation = useResponsiveValue({ initial: 'vertical', sm: 'horizontal' }, 'vertical')
 */
export function useResponsiveValue<T>(value: Responsive<T>, fallback: T): T {
	return useResponsiveValueIn(useBreakpointFrame(), value, fallback)
}

/**
 * The value that a responsive prop holds at the width of `frame`, or at the
 * viewport when `frame` is `null`. A component that portals its own surface
 * reads the frame that holds the portal with this hook, because its context
 * is the frame of the place that renders it (`findFrame`).
 *
 * @param frame - The breakpoint frame to read, or `null` for the viewport.
 * @param value - The single or per-breakpoint value.
 * @param fallback - The value below the first breakpoint that the map names.
 * @returns The value in force at the width of `frame`.
 *
 * @internal
 */
export function useResponsiveValueIn<T>(
	frame: BreakpointFrameContextValue | null,
	value: Responsive<T>,
	fallback: T,
): T {
	const key = namedBreakpoints(value).join(' ')

	// The joined names keep the callbacks stable while a parent passes a new map of the same breakpoints.
	const named = useMemo(() => (key ? (key.split(' ') as MinBreakpoint[]) : []), [key])

	const subscribe = useCallback(
		(callback: () => void) => {
			if (named.length === 0) return () => {}

			if (frame) return frame.subscribe(callback)

			const unsubscribes = named.map((bp) => subscribeMediaQuery(query(bp), callback))

			return () => {
				for (const unsubscribe of unsubscribes) unsubscribe()
			}
		},
		[named, frame],
	)

	const getSnapshot = useCallback(
		(): Breakpoint =>
			named.find((bp) => (frame ? frame.matches(bp) : matchesMediaQuery(query(bp)))) ?? 'initial',
		[named, frame],
	)

	const getServerSnapshot = useCallback((): Breakpoint => named[0] ?? 'initial', [named])

	return valueAt(value, useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot), fallback)
}
