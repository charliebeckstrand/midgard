'use client'

import { useCallback, useRef, useState } from 'react'
import type { MapSeriesColor } from '../../recipes/kata/map'
import type { LngLat } from './types'

/** The overlay kinds that register legend entries. @internal */
export type MapOverlayKind = 'route' | 'point' | 'marker'

/**
 * One overlay mark's registration: what the legend draws for it, and what the
 * keyboard cursor needs to stand on it. The plat resolves slot colours across
 * the registered order, after the region categories.
 *
 * The ledger is one list rather than two. A second registry for the cursor would
 * double the state commits per mark and split one identity across two lists that
 * must hold the same order — so the legend and the cursor read the same entry.
 *
 * @internal
 */
export type MapOverlayEntry = {
	/** The mark's identity: its caller-supplied `id`, else a generated one. Re-registering replaces in place. */
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
	/**
	 * Every place the keyboard cursor can stand on this mark, in lon/lat: one for
	 * a singular mark, one per dot for a plural one, and none where the mark has
	 * no geometry yet.
	 *
	 * A getter rather than a value, and stable across renders, so a mark that
	 * moves — a route whose geometry lands from the network — needs no
	 * re-registration, and an inline `at={[lon, lat]}` never churns the ledger.
	 */
	stopsAt?: () => LngLat[]
	/**
	 * What one of this mark's stops reads out, where that differs from the mark's
	 * own `label` and `detail` — a plural mark's dots, each naming its own stop.
	 * `undefined` falls back to the mark, which is what every singular mark does.
	 */
	stopReadout?: (stop: number) => { label: string; detail?: string } | undefined
	/**
	 * Picks one of the mark's stops: what Enter or Space calls with the keyboard
	 * cursor on it, and what a click reports. Stable like {@link stopsAt}, and
	 * registered only where the mark answers a pick — so its presence is the
	 * question the plat's tab-stop gate asks.
	 */
	activate?: (stop: number) => void
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
