'use client'

import {
	type ReactNode,
	type RefObject,
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { useHoverAcrossScroll } from '../../hooks'
import { createEmitter } from '../../utilities'
import { samePoint } from '../chart/engine/context'
import {
	type MapHoverGet,
	MapHoverGetContext,
	type MapHoverHold,
	MapHoverHoldContext,
	type MapHoverSet,
	MapHoverSetContext,
	type MapHoverState,
	MapHoverStateContext,
	MapPointedMarkContext,
	type MapPointedStore,
} from './context'
import { targetAt } from './engine/map-hover/anchor'
import { type MapHoverTarget, sameMark, sameTarget } from './engine/map-hover/target'
import { useMapRegionPreload } from './use-map-region-preload'

/** Props for {@link MapHoverProvider}. @internal */
type MapHoverProviderProps = {
	/** Whether the tooltip is on; gates the scroll listener on a stable flag. */
	enabled: boolean
	plotRef: RefObject<HTMLDivElement | null>
	/** Whether a region's category is matched and shown — the pointed-emphasis gate, the same silence the tooltip keeps off data. */
	regionActive: (index: number) => boolean
	/** The legend id under emphasis. It rides the pointed-mark store, so a legend hover renders only the marks it dims or lights. */
	emphasis: string | null
	/** Warms the region the pointer settles on; `undefined` on a plat that asked for no warming. */
	preloadRegion: ((index: number) => void) | undefined
	children: ReactNode
}

/** A {@link MapPointedStore} and its writer. @internal */
function createPointedStore(): MapPointedStore & {
	publish: (next: MapHoverTarget | null, emphasis: string | null) => void
} {
	let current: MapHoverTarget | null = null

	let focus: string | null = null

	const { subscribe, emit } = createEmitter()

	return {
		get: () => current,
		emphasis: () => focus,
		subscribe,
		publish: (next, emphasis) => {
			// Pinned at mark granularity: a move to another stop of the same mark
			// keeps the held target, so it publishes nothing.
			const mark = sameMark(current, next) ? current : next

			if (mark === current && emphasis === focus) return

			current = mark

			focus = emphasis

			emit()
		},
	}
}

/**
 * Owns the pointer readout and hands it down split three ways:
 *
 * - the stable mover through {@link MapHoverSetContext} — the marks read it, so
 *   they never repaint as the pointer travels
 * - the live {@link MapHoverState} through its own context, which only the
 *   tooltip reads
 * - the pointed mark through {@link MapPointedMarkContext}, whose identity holds
 *   across a same-mark move so the marks reading it repaint only on discrete
 *   crossings
 *
 * Holding the state here, below {@link MapPlat} and around the plot alone, keeps
 * a pointer move off the plat, the legend, and the region layer. The provider
 * re-renders and its stable `children` bail, so the tooltip is the sole subtree
 * that repaints.
 *
 * @internal
 */
export function MapHoverProvider({
	enabled,
	plotRef,
	regionActive,
	emphasis,
	preloadRegion,
	children,
}: MapHoverProviderProps) {
	const [state, setState] = useState<MapHoverState>({ target: null, point: null })

	// Whether a pinch holds the readout. See {@link MapHoverHold}.
	const held = useRef(false)

	// The target of the last write that `set` took. See {@link MapHoverGet}.
	const hovered = useRef<MapHoverTarget | null>(null)

	const set = useCallback<MapHoverSet>((target, point) => {
		if (held.current && target !== null) return

		hovered.current = target

		// Bail on a no-op so a scroll's repeated clears cost one render, and a
		// page scroll far from this map costs none. A same-mark move keeps the
		// held target's identity — every tracked pointer event builds a fresh
		// target object — so the pointed-mark context below changes only on a
		// crossing, never per pixel.
		setState((prev) => {
			const same = sameTarget(prev.target, target)

			if (same && samePoint(prev.point, point)) return prev

			return { target: same ? prev.target : target, point }
		})
	}, [])

	const hold = useCallback<MapHoverHold>(
		(on) => {
			held.current = on

			if (on) set(null, null)
		},
		[set],
	)

	// The pointed mark the marks dim against: the hover target, gated so a
	// region outside every live group — no data, or its category toggled
	// off — takes no emphasis; isolating the neutral fill would read as a
	// broken map, the way a chart never dims against a hidden series.
	const target = state.target

	// Warming reads the target above rather than the gated `pointed` below, and
	// runs here because this is where the pointer and the keyboard cursor already
	// meet: the plat sits above this provider and could not see either.
	useMapRegionPreload(target, preloadRegion)

	const pointed =
		target !== null && target.kind === 'region' && !regionActive(target.index) ? null : target

	// The marks read the pointed mark from a store, each for its own answer. The
	// store keeps one identity, so the context holds and a crossing renders only
	// the marks whose answer changed. The store pins the mark, the way the chart
	// frame pins its own pointed mark: it names the mark, never the stop within
	// it. Sweeping between the dots of one plural mark would otherwise republish
	// on each crossing and re-render every mark — the regions, the range legend,
	// all the overlays — for the answer each already held.
	const [pointedStore] = useState(createPointedStore)

	useLayoutEffect(() => pointedStore.publish(pointed, emphasis), [pointedStore, pointed, emphasis])

	const get = useCallback<MapHoverGet>(() => hovered.current, [])

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

			const target = targetAt(under)

			// Over the plat but between marks — the ocean — reads nothing.
			set(target, target === null ? null : { x: clientX, y: clientY })
		},
		[plotRef, set],
	)

	useHoverAcrossScroll(enabled, clear, resolveAt)

	return (
		<MapHoverSetContext value={set}>
			<MapHoverGetContext value={get}>
				<MapHoverHoldContext value={hold}>
					<MapPointedMarkContext value={pointedStore}>
						<MapHoverStateContext value={state}>{children}</MapHoverStateContext>
					</MapPointedMarkContext>
				</MapHoverHoldContext>
			</MapHoverGetContext>
		</MapHoverSetContext>
	)
}
