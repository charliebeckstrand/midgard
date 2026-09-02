'use client'

import {
	type FocusEvent,
	type KeyboardEvent,
	type RefObject,
	useEffect,
	useRef,
	useState,
} from 'react'
import { usePlotTabStop } from '../../hooks/use-plot-tab-stop'
import { useMapHoverSet } from './context'
import { MAP_CURSOR_INSET } from './engine/map-constants'
import { type MapHoverTarget, sameTarget } from './engine/map-hover/target'
import { isMapActivateKey, moveMapCursor } from './engine/map-keyboard/cursor'
import type { MapStop } from './engine/map-keyboard/stops'
import { frameToClient } from './engine/map-projection/frame'
import { mapZoomKey, zoomKeyFactor } from './engine/map-zoom/gesture'
import { applyTransform, MAP_FIT_TRANSFORM, type MapTransform } from './engine/map-zoom/transform'
import type { MapPoint2D } from './engine/types'
import type { MapZoomCursor } from './use-map-zoom'

/**
 * A stop as one string, so the cursor's position resolves through a map rather
 * than a scan. Keyed by the stop and not only by the mark: a plural mark holds
 * one key per dot, and collapsing them would point the cursor at whichever dot
 * registered last.
 *
 * @internal
 */
function stopKey(target: MapHoverTarget): string {
	return target.kind === 'region' ? `r${target.index}` : `e${target.id}:${target.stop}`
}

/** The handlers {@link useMapKeyboard} spreads onto the plot region to make it a navigable tab stop. @internal */
export type MapKeyboardProps = {
	tabIndex: 0
	onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
	onBlur: (event: FocusEvent<HTMLElement>) => void
}

/** What {@link useMapKeyboard} needs from the plat to drive a cursor. @internal */
export type MapKeyboardOptions = {
	/** Whether the cursor has an output — a readout, a pick, or both; `false` leaves the region unfocusable. */
	enabled: boolean
	/**
	 * Every place the cursor can stand — the regions at their centroids, then the
	 * overlay marks at theirs — resolved on demand. A closure, not an array: the
	 * `geoCentroid` pass behind the region half measures every ring in the atlas
	 * (~30 ms across 3,000 counties, against a ~70 ms mount), so it must never run
	 * on the mount or the resize path for a cursor most maps never carry. This is
	 * called on the first navigation key and not again until a refit, a resize, or
	 * an overlay registration replaces it.
	 */
	resolveStops: () => MapStop[]
	/** The active viewBox width and height, for the frame-to-client conversion. */
	view: { width: number; height: number }
	/** The plot's SVG, whose box places a stop in the viewport. */
	svgRef: RefObject<SVGSVGElement | null>
	/** Picks the stop under the cursor — a region by index, an overlay through its own reporter. */
	activate: (target: MapHoverTarget) => void
	/**
	 * The view the zoom layer draws through, or `null` on a map that does not
	 * zoom. The cursor reads it to anchor its readout where the map draws the
	 * stop, and drives it two ways: `+`, `-`, and `0` step and reset the scale,
	 * and a step onto a stop the zoom put off-frame pans the view to it.
	 */
	zoom: MapZoomCursor | null
}

/**
 * Makes the plot region a single arrow-navigable tab stop driving the shared
 * hover context, so the readout and the pointed-mark recede answer the keyboard
 * the way they answer the pointer — the chart module's model
 * (`use-chart-keyboard`), over a geography's own axes.
 *
 * Focus alone only rings the region: a click focuses it too, and to seize the
 * readout from the pointer would jar. The first arrow enters at the first stop;
 * from there each arrow steps to the nearest stop bearing that way — regions and
 * overlay marks in one field, as the pointer crosses them — Home and End jump to
 * the ends of the list, Enter or Space picks the stop under the cursor, and
 * Escape leaves through the shared {@link usePlotTabStop} exit.
 *
 * A zooming map answers three more keys on that one stop — `+` and `-` step the
 * scale about the frame's centre, `0` returns to the fit — and the cursor takes
 * the view with it: a step onto a stop the zoom put off-frame pans the map to
 * show it, so navigation never points a reader at something the plot does not
 * draw.
 *
 * No drawn mark is focusable. The plot is a `role="img"` leaf over an
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
	resolveStops,
	view,
	svgRef,
	activate,
	zoom,
}: MapKeyboardOptions): MapKeyboardProps | null {
	const set = useMapHoverSet()

	// The cursor holds the mark it sits on, not its position in the stop list: an
	// overlay that registers or unmounts re-orders that list, and an index would
	// silently re-point at a different mark.
	const [cursor, setCursor] = useState<MapHoverTarget | null>(null)

	// The resolver's last result, held until a refit or a registration hands over
	// a new resolver. Keyed on the resolver's own identity, so there is no second
	// dependency to keep in step. The index beside it turns the cursor's mark back
	// into its position in O(1): a county atlas holds three thousand stops, and
	// this is read on every render while a cursor is live.
	const held = useRef<{ from: () => MapStop[]; value: MapStop[]; where: Map<string, number> }>(null)

	const stops = (): MapStop[] => {
		if (held.current?.from !== resolveStops) {
			const value = resolveStops()

			const where = new Map(value.map((stop, index) => [stopKey(stop.target), index]))

			held.current = { from: resolveStops, value, where }
		}

		return held.current.value
	}

	/** Where `cursor` stands in the current stop list, or `null` once it has left it. */
	const at = (): number | null => {
		if (cursor === null) return null

		stops()

		return held.current?.where.get(stopKey(cursor)) ?? null
	}

	const transform = zoom?.transform ?? MAP_FIT_TRANSFORM

	// The drawn point the readout last anchored to. A keypress anchors directly,
	// so the re-anchor effect below must fire only for the cases it exists
	// for — otherwise every keypress would read the SVG's box twice, the second
	// read forcing a layout recalc over the whole region tree. Held after the
	// transform rather than before it, so a pan or a zoom re-anchors the readout
	// the same way a refit does.
	const anchored = useRef<MapPoint2D | null>(null)

	/**
	 * Puts the readout on a stop where the layer draws it, through the transform
	 * it is given. It moves nothing: a pointer gesture and a refit both land here
	 * to re-place a readout the reader did not ask to move.
	 */
	const anchor = (stop: MapStop | null, through: MapTransform) => {
		// Every resolve mints fresh target objects, so hold the previous one where
		// it names the same mark: the cursor is a dependency of the effects below,
		// and a refit frame would otherwise re-run them all for a mark that has not
		// moved.
		setCursor((prev) => (sameTarget(prev, stop?.target ?? null) ? prev : (stop?.target ?? null)))

		const svg = svgRef.current

		const drawn = stop === null ? null : applyTransform(stop.at, through)

		const point =
			drawn === null || svg === null
				? null
				: frameToClient(drawn, svg.getBoundingClientRect(), view.width, view.height)

		anchored.current = drawn

		if (stop === null || point === null) set(null, null)
		else set(stop.target, point)
	}

	/**
	 * Steps the cursor onto a stop, taking the view with it: a zoomed map pans
	 * until the stop draws inside the frame, so navigation never points a reader
	 * at something the plot does not draw. The pan's result is taken back rather
	 * than waited for, so the readout anchors on the same beat as the step.
	 *
	 * Only a keypress calls this. A pointer gesture or a refit re-anchors through
	 * {@link anchor} alone — driving the view from there would fight the gesture,
	 * and commit a second transform for every one the reader made.
	 */
	const show = (stop: MapStop | null) => {
		anchor(stop, stop === null || zoom === null ? transform : zoom.show(stop.at, MAP_CURSOR_INSET))
	}

	const { exit, onBlur } = usePlotTabStop(cursor !== null, () => show(null))

	// Release what the cursor held once navigation switches off — the readout
	// unmounted, the pick removed — so no stale emphasis lingers with no way to
	// clear it (a blur never fires).
	useEffect(() => {
		if (!enabled && cursor !== null) {
			set(null, null)

			setCursor(null)
		}
	}, [enabled, cursor, set])

	// A refit reprojects every stop, and a zoom redraws it somewhere else, so the
	// readout would otherwise sit at the pre-resize (or pre-zoom) position until
	// the next keypress. Watched through where the cursor's own stop draws, so
	// both causes reach it through one comparison.
	const index = at()

	const current = index === null ? null : (stops()[index] ?? null)

	const drawn = current === null ? null : applyTransform(current.at, transform)

	const moved =
		drawn !== null &&
		(anchored.current === null || anchored.current.x !== drawn.x || anchored.current.y !== drawn.y)

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-anchors when the cursor's projected stop moves; the reader is read fresh at fire time
	useEffect(() => {
		if (current !== null && moved) anchor(current, transform)
	}, [moved])

	const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		// The zoom keys, read first because they claim keys the cursor does not: a
		// reader who can only point with a keyboard still reaches every scale the
		// wheel does, and `0` is the way back to the whole geography. The readout
		// re-anchors through the effect above, which the moved transform trips.
		if (zoom !== null) {
			const scale = mapZoomKey(event.key)

			if (scale !== null) {
				event.preventDefault()

				if (scale === 'fit') zoom.fit()
				else zoom.stepZoom(zoomKeyFactor(scale))

				return
			}
		}

		// Enter and Space pick the mark under the cursor — the click's keyboard
		// counterpart, and half the reason the map is navigable. Space would
		// otherwise scroll the page out from under the reader.
		if (isMapActivateKey(event.key)) {
			if (cursor === null) return

			event.preventDefault()

			activate(cursor)

			return
		}

		const move = moveMapCursor(at(), event.key, stops())

		if (!move.handled) return

		event.preventDefault()

		show(move.stop)

		if (move.stop === null) exit(event.currentTarget)
	}

	return enabled ? { tabIndex: 0, onKeyDown, onBlur } : null
}
