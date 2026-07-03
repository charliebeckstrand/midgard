'use client'

import { useCallback, useRef, useState } from 'react'
import type { MapSeriesColor } from '../../recipes/kata/map'

/** The overlay kinds that register legend entries. @internal */
export type MapOverlayKind = 'route' | 'point' | 'marker'

/**
 * One overlay's legend registration: its identity, name, swatch shape, and
 * optional colour override and trailing detail. The surface resolves slot
 * colours across the registered order, after the region categories.
 *
 * @internal
 */
export type MapOverlayEntry = {
	/** Stable per-instance id (`useId`-derived); re-registering replaces in place. */
	id: string
	/** Legend and tooltip name. */
	label: string
	kind: MapOverlayKind
	/** Swatch shape, mirroring the mark: `line` for routes and markers, `dot` for points. */
	swatch: 'line' | 'dot'
	/** Named mark colour override; defaults to the next slot after the categories. */
	color?: MapSeriesColor
	/** A trailing readout — a route's mileage, a point's value. */
	detail?: string
}

/**
 * The plat's overlay ledger: children register their legend entries on mount
 * and unregister on unmount. Each id remembers the position it first
 * registered at, so a re-registration — a relabelled overlay's effect
 * re-running, or StrictMode's doubled mount — lands back in place with its
 * slot colour held, even though React runs the old effect's cleanup first.
 *
 * @internal
 */
export function useMapLegendRegistry(): {
	entries: MapOverlayEntry[]
	register: (entry: MapOverlayEntry) => () => void
} {
	const [entries, setEntries] = useState<MapOverlayEntry[]>([])

	const orderRef = useRef(new Map<string, number>())

	const nextOrderRef = useRef(0)

	const register = useCallback((entry: MapOverlayEntry) => {
		const order = orderRef.current

		if (!order.has(entry.id)) order.set(entry.id, nextOrderRef.current++)

		setEntries((current) => {
			const next = [...current.filter((existing) => existing.id !== entry.id), entry]

			return next.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
		})

		return () => {
			setEntries((current) => current.filter((existing) => existing.id !== entry.id))
		}
	}, [])

	return { entries, register }
}
