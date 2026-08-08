'use client'

import { type ReactNode, type RefObject, useCallback, useMemo, useRef, useState } from 'react'
import { useHoverAcrossScroll } from '../../hooks'
import {
	type MapHoverSet,
	MapHoverSetContext,
	type MapHoverState,
	MapHoverStateContext,
	MapPointedMarkContext,
} from './context'
import { markAnchorAt, regionIndexAt } from './engine/map-hover/anchor'
import { type MapHoverTarget, sameMark, sameTarget } from './engine/map-hover/target'
import type { MapPoint2D } from './engine/types'

/** Props for {@link MapHoverProvider}. @internal */
type MapHoverProviderProps = {
	/** Whether the tooltip is on; gates the scroll listener on a stable flag. */
	enabled: boolean
	plotRef: RefObject<HTMLDivElement | null>
	/** Whether a region's category is matched and shown — the pointed-emphasis gate, the same silence the tooltip keeps off data. */
	regionActive: (index: number) => boolean
	children: ReactNode
}

/** Whether two hover points coincide, so a redundant hover write can bail. @internal */
function samePoint(a: MapPoint2D | null, b: MapPoint2D | null): boolean {
	return a === b || (a !== null && b !== null && a.x === b.x && a.y === b.y)
}

/**
 * Owns the pointer readout and hands it down split three ways: the stable
 * mover through {@link MapHoverSetContext} — the marks read it, so they never
 * repaint as the pointer travels — the live {@link MapHoverState} through its
 * own context, which only the tooltip reads, and the pointed mark through
 * {@link MapPointedMarkContext}, whose identity holds across a same-mark move
 * so the marks reading it repaint only on discrete crossings. Holding the
 * state here, below {@link MapPlat} and around the plot alone, keeps a pointer
 * move from re-rendering the plat, the legend, or the region layer: the
 * provider re-renders and its stable `children` bail, so the tooltip is the
 * sole subtree that repaints.
 *
 * @internal
 */
export function MapHoverProvider({
	enabled,
	plotRef,
	regionActive,
	children,
}: MapHoverProviderProps) {
	const [state, setState] = useState<MapHoverState>({ target: null, point: null })

	const set = useCallback<MapHoverSet>(
		(target, point) =>
			// Bail on a no-op so a scroll's repeated clears cost one render, and a
			// page scroll far from this map costs none. A same-mark move keeps the
			// held target's identity — every tracked pointer event builds a fresh
			// target object — so the pointed-mark context below changes only on a
			// crossing, never per pixel.
			setState((prev) => {
				if (sameTarget(prev.target, target) && samePoint(prev.point, point)) return prev

				return { target: sameTarget(prev.target, target) ? prev.target : target, point }
			}),
		[],
	)

	// The pointed mark the marks dim against: the hover target, gated so a
	// region outside every live group — no data, or its category toggled
	// off — takes no emphasis; isolating the neutral fill would read as a
	// broken map, the way a chart never dims against a hidden series.
	const target = state.target

	// Pinned at mark granularity, the way the chart frame pins its own pointed
	// mark: this value names the mark, never the stop within it, and every mark on
	// the map reads it. Sweeping between the dots of one plural mark would
	// otherwise republish on each crossing and re-render every mark — the regions,
	// the range legend, all the overlays — for the answer each already held.
	const pinned = useRef<MapHoverTarget | null>(null)

	const pointed = useMemo(() => {
		const next =
			target !== null && target.kind === 'region' && !regionActive(target.index) ? null : target

		if (sameMark(pinned.current, next)) return pinned.current

		pinned.current = next

		return next
	}, [target, regionActive])

	const clear = useCallback(() => set(null, null), [set])

	// A scroll slides the marks under a stationary pointer without firing a pointer
	// event; recompute at its last position once the scroll settles, reading the
	// mark now under it straight off the DOM — a synthetic move never reaches the
	// region handlers.
	const resolveAt = useCallback(
		(clientX: number, clientY: number) => {
			const plot = plotRef.current

			const under = plot === null ? null : document.elementFromPoint(clientX, clientY)

			if (plot === null || under === null || !plot.contains(under)) {
				set(null, null)

				return
			}

			const point = { x: clientX, y: clientY }

			const region = regionIndexAt(under)

			if (region !== null) {
				set({ kind: 'region', index: region }, point)

				return
			}

			// Resolved through the shared anchor reader, so a plural mark re-settles
			// on the dot the pointer is actually over rather than on the mark's first.
			const mark = markAnchorAt(under)

			if (mark !== null) {
				set({ kind: 'entry', ...mark }, point)

				return
			}

			// Over the plat but between marks — the ocean — reads nothing.
			set(null, null)
		},
		[plotRef, set],
	)

	useHoverAcrossScroll(enabled, clear, resolveAt)

	return (
		<MapHoverSetContext value={set}>
			<MapPointedMarkContext value={pointed}>
				<MapHoverStateContext value={state}>{children}</MapHoverStateContext>
			</MapPointedMarkContext>
		</MapHoverSetContext>
	)
}
