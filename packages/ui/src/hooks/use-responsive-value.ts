'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import {
	BREAKPOINT_WIDTHS,
	BREAKPOINTS,
	type Breakpoint,
	type MinBreakpoint,
	type Responsive,
	valueAt,
} from '../types/responsive'
import { isMediaMatch, subscribeMediaQuery } from '../utilities/media-query'

/*
 * Re-exported here, not only from `types`, because it is this hook's parameter type. The
 * types barrel is not one of the package's entry points.
 */
export type { Responsive }

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
	const key = namedBreakpoints(value).join(' ')

	// The joined names keep the callbacks stable while a parent passes a new map of the same breakpoints.
	const named = useMemo(() => (key ? (key.split(' ') as MinBreakpoint[]) : []), [key])

	const subscribe = useCallback(
		(callback: () => void) => {
			const unsubscribes = named.map((bp) => subscribeMediaQuery(query(bp), callback))

			return () => {
				for (const unsubscribe of unsubscribes) unsubscribe()
			}
		},
		[named],
	)

	const getSnapshot = useCallback(
		(): Breakpoint => named.find((bp) => isMediaMatch(query(bp))) ?? 'initial',
		[named],
	)

	const getServerSnapshot = useCallback((): Breakpoint => named[0] ?? 'initial', [named])

	return valueAt(value, useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot), fallback)
}
