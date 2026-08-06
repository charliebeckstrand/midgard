'use client'

import { type KeyboardEvent, type RefObject, useEffect, useRef, useState } from 'react'
import { usePlotTabStop } from '../../hooks/use-plot-tab-stop'
import { useMapHoverSet } from './context'
import type { MapPoint2D } from './map-geometry'
import { isMapActivateKey, moveMapCursor } from './map-keyboard'
import { frameToClient } from './map-projection'

/** The handlers {@link useMapKeyboard} spreads onto the plot region to make it a navigable tab stop. @internal */
export type MapKeyboardProps = {
	tabIndex: 0
	onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
	onBlur: (event: React.FocusEvent<HTMLElement>) => void
}

/** What {@link useMapKeyboard} needs from the plat to drive a cursor. @internal */
export type MapKeyboardOptions = {
	/** Whether the cursor has an output — a readout, a pick, or both; `false` leaves the region unfocusable. */
	enabled: boolean
	/**
	 * Each region's frame-unit centroid, resolved on demand. A closure, not an
	 * array: the `geoCentroid` pass behind it measures every ring in the atlas
	 * (~30 ms across 3,000 counties, against a ~70 ms mount), so it must never run
	 * on the mount or the resize path for a cursor most maps never carry. This is
	 * called on the first navigation key and not again until a refit replaces it.
	 */
	resolveCentroids: () => (MapPoint2D | null)[]
	/** The active viewBox width and height, for the frame-to-client conversion. */
	view: { width: number; height: number }
	/** The plot's SVG, whose box places a centroid in the viewport. */
	svgRef: RefObject<SVGSVGElement | null>
	/** Reports the region Enter or Space picks; omitted, those keys pass through. */
	activate: ((index: number) => void) | undefined
}

/**
 * Makes the plot region a single arrow-navigable tab stop driving the shared
 * hover context, so the readout and the pointed-mark recede answer the keyboard
 * the way they answer the pointer — the chart module's model
 * (`use-chart-keyboard`), over a geography's own axes.
 *
 * Focus alone only rings the region: a click focuses it too, and to seize the
 * readout from the pointer would jar. The first arrow enters at the first drawn
 * region; from there each arrow steps to the nearest region bearing that way,
 * Home and End jump to the ends of the atlas's own order, Enter or Space picks
 * the region under the cursor, and Escape leaves through the shared
 * {@link usePlotTabStop} exit.
 *
 * No region path is focusable. The plot is a `role="img"` leaf over an
 * `aria-hidden` SVG, so a focusable path would be unreachable to assistive tech
 * and, at a county atlas's scale, thousands of invisible stops; the region
 * values ship in the visually-hidden table instead, and this drives the same
 * readout the pointer drives.
 *
 * @remarks A scroll clears the readout, as it does for the pointer
 * (`useHoverAcrossScroll`), and the cursor does not restore it: that hook
 * re-resolves at the pointer's last position, which a keyboard reader never set.
 * The cursor itself survives, so the next arrow brings the readout back at the
 * map's new position.
 *
 * Returns `null` — no tab stop — when the cursor has no output, leaving the
 * region the plain `role="img"` it was.
 *
 * @internal
 */
export function useMapKeyboard({
	enabled,
	resolveCentroids,
	view,
	svgRef,
	activate,
}: MapKeyboardOptions): MapKeyboardProps | null {
	const set = useMapHoverSet()

	const [cursor, setCursor] = useState<number | null>(null)

	// The resolver's last result, held until a refit hands over a new resolver.
	// Keyed on the resolver's own identity, so a resize invalidates it without a
	// second dependency to keep in step.
	const stops = useRef<{ from: () => (MapPoint2D | null)[]; value: (MapPoint2D | null)[] } | null>(
		null,
	)

	const centroids = (): (MapPoint2D | null)[] => {
		if (stops.current?.from !== resolveCentroids) {
			stops.current = { from: resolveCentroids, value: resolveCentroids() }
		}

		return stops.current.value
	}

	// The frame point the readout last anchored to. A keypress anchors directly,
	// so the re-anchor effect below must fire only for the refit case it exists
	// for — otherwise every keypress would read the SVG's box twice, the second
	// read forcing a layout recalc over the whole region tree.
	const anchored = useRef<MapPoint2D | null>(null)

	const show = (next: number | null) => {
		setCursor(next)

		const centroid = next === null ? null : (centroids()[next] ?? null)

		const svg = svgRef.current

		const point =
			centroid === null || svg === null
				? null
				: frameToClient(centroid, svg.getBoundingClientRect(), view.width, view.height)

		anchored.current = centroid

		if (next === null || point === null) set(null, null)
		else set({ kind: 'region', index: next }, point)
	}

	const clear = () => show(null)

	const { exit, onBlur } = usePlotTabStop(cursor !== null, clear)

	// Release what the cursor held once navigation switches off — the readout
	// unmounted, the pick removed — so no stale emphasis lingers with no way to
	// clear it (a blur never fires).
	useEffect(() => {
		if (!enabled && cursor !== null) {
			set(null, null)

			setCursor(null)
		}
	}, [enabled, cursor, set])

	// A refit reprojects every centroid, so the readout would otherwise sit at the
	// pre-resize position until the next keypress. Watched through the cursor's
	// own centroid, and only where it actually moved.
	const centroid = cursor === null ? null : (centroids()[cursor] ?? null)

	const moved =
		centroid !== null &&
		(anchored.current === null ||
			anchored.current.x !== centroid.x ||
			anchored.current.y !== centroid.y)

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-anchors when the cursor's projected centroid moves; the reader is read fresh at fire time
	useEffect(() => {
		if (cursor !== null && moved) show(cursor)
	}, [moved])

	const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		// Enter and Space pick the region under the cursor — the click's keyboard
		// counterpart, and half the reason the map is navigable. Space would
		// otherwise scroll the page out from under the reader.
		if (isMapActivateKey(event.key)) {
			if (cursor === null || activate === undefined) return

			event.preventDefault()

			activate(cursor)

			return
		}

		const move = moveMapCursor(cursor, event.key, centroids())

		if (!move.handled) return

		event.preventDefault()

		show(move.cursor)

		if (move.cursor === null) exit(event.currentTarget)
	}

	return enabled ? { tabIndex: 0, onKeyDown, onBlur } : null
}
