'use client'

import { useSyncExternalStore } from 'react'
import { createContext } from '../../core/create-context'
import type { MapSeriesColor } from '../../recipes/kata/map'
import type { ChartPress } from '../chart/engine/types'
import type { MapDotPool } from './engine/map-cluster/pool'
import type { MapClusterStore } from './engine/map-cluster/sets'
import type { MapHoverTarget, MapOverlayTarget } from './engine/map-hover/target'
import type { MapStopMoves } from './engine/map-keyboard/stops'
import type { MapOverlayEntry } from './engine/map-overlay/entry'
import type { MapSpareStore } from './engine/map-overlay/spare'
import type { MapOverlaySelection, MapPoint2D, MapProjector } from './engine/types'
import type { MapZoom } from './use-map-zoom'

/**
 * The live hover readout the tooltip anchors to: the pointed target and the
 * pointer's viewport coordinates. Split from the {@link MapHoverActions} mover into
 * its own context so pointer movement (which churns this value every frame)
 * re-renders only the tooltip that reads it. The marks read the stable mover
 * instead, so they never repaint as the pointer travels.
 *
 * @internal
 */
export type MapHoverState = {
	/** The hovered target, or `null` when the pointer is away. */
	target: MapHoverTarget | null
	/** The pointer's client (viewport) coordinates while hovering, `null` at rest. */
	point: MapPoint2D | null
}

export const [MapHoverStateContext, useMapHoverState] =
	createContext<MapHoverState>('MapHoverState')

/**
 * The stable functions of the hover provider, held apart from
 * {@link MapHoverState}. Each keeps its identity, so a mark or a hook that
 * reads them never renders again when the pointer moves.
 *
 * @internal
 */
export type MapHoverActions = {
	/** Moves the hover, or clears it with `null`s. */
	set: (target: MapHoverTarget | null, point: MapPoint2D | null) => void
	/**
	 * Reads the hover target that the provider holds now, with no
	 * subscription. The keyboard cursor reads it on Escape to find whether a
	 * pointer readout is live.
	 */
	get: () => MapHoverTarget | null
	/**
	 * Holds the readout through a pinch or a wheel zoom, or lets it go. A held
	 * readout takes a clear and no new target, and holding it clears it.
	 *
	 * A touch pointer is captured on contact by the region or the mark under it.
	 * That element gets each move of the finger, whatever the layer's
	 * `pointer-events`. So each move of a pinch would raise the readout again,
	 * and the map would recede behind a tooltip. The hold stops every writer at
	 * once.
	 */
	hold: (held: boolean) => void
}

export const [MapHoverActionsContext, useMapHoverActions] =
	createContext<MapHoverActions>('MapHoverActions')

/**
 * The mark the pointer sits on (a region or an overlay entry), taking the
 * emphasis, so everything else on the map recedes behind it. It is the map's
 * twin of the chart's pointed-mark emphasis. Derived from the hover target but
 * held apart from {@link MapHoverState}. The hover provider pins the target's
 * identity across a same-mark move, so the value changes only on a discrete
 * crossing, never as the pointer travels. A region whose category is unmatched
 * or toggled off never takes it, the same silence the tooltip keeps off data.
 *
 * The value lives in a store, not in the context value. Each mark reads only
 * the answer it needs through {@link useMapPointed}, such as whether it dims. A
 * crossing between two regions then renders no overlay mark, because the answer
 * of each overlay mark holds.
 *
 * @internal
 */
export type MapPointedStore = {
	/** The pointed mark, or `null` when the pointer sits on no mark. */
	get: () => MapHoverTarget | null
	/** The legend id under emphasis, or `null`. It rides the same store, so a mark reads one answer from both. */
	emphasis: () => string | null
	/** Calls `listener` each time the pointed mark or the emphasis changes, and returns the unsubscribe. */
	subscribe: (listener: () => void) => () => void
}

export const [MapPointedMarkContext, useMapPointedStore] =
	createContext<MapPointedStore>('MapPointedMark')

/**
 * Reads one answer from the pointed mark and the legend emphasis. The reader
 * renders again only when that answer changes, so `select` must return a
 * primitive or a stable value.
 *
 * @internal
 */
export function useMapPointed<T>(
	select: (pointed: MapHoverTarget | null, emphasis: string | null) => T,
): T {
	const store = useMapPointedStore()

	const read = () => select(store.get(), store.emphasis())

	return useSyncExternalStore(store.subscribe, read, read)
}

/** The pointed mark itself, for a reader that draws from it. See {@link MapPointedStore}. @internal */
export function useMapPointedMark(): MapHoverTarget | null {
	return useMapPointed(identity)
}

function identity<T>(value: T): T {
	return value
}

/**
 * The view transform and its gestures, or `null` on a map that does not zoom.
 * It is one encoding of that bit, which the layer, the plot region, and the
 * keyboard cursor all test the same way. Provided by {@link MapZoomProvider}, which sits
 * below the plat so a gesture never re-renders it.
 *
 * @internal
 */
export const [MapZoomContext, useMapZoomView] = createContext<MapZoom | null>('MapZoom')

/**
 * What one device pixel spans in frame units under the plat's zoom: `1` at the
 * fit, and `1 / k` under a transform. It is the marks' one reading of the zoom,
 * and the whole of it. A mark converts a pixel spec to frame units by one
 * multiply, and never asks what the transform is.
 *
 * Every device-pixel spec the module draws takes that multiply:
 *
 * - The stroke width of each mark and each hairline.
 * - A dot's radius, which is half its cap's width.
 * - The hit circles and hit bands.
 * - The cluster reach, and the count inside a summary.
 *
 * Nothing asks the browser to hold a size for it. A
 * `vector-effect="non-scaling-stroke"` did once, which put the drawn size of
 * every mark on a stroke transform this module cannot reach. See `MapDot` for
 * what that cost.
 *
 * Held apart from {@link MapPlatContextValue} because a zoom step churns this
 * value on every wheel notch. The marks that answer it re-render per notch,
 * while the legend and the plat above them hold. The region layer answers on
 * one group rather than per region. Defaults to `1`, so a mark rendered outside
 * a zooming plat reads the frame as device pixels, which every settled unzoomed
 * frame is.
 *
 * @internal
 */
export const [MapZoomScaleContext, useMapZoomScale] = createContext<number>('MapZoomScale', {
	default: 1,
})

/**
 * What {@link MapPlat} provides its overlay children: the fitted projection
 * as a closure, legend registration, and the resolved slot color per
 * registered entry. It also provides the legend's toggle state (`hidden`) and
 * the standing pick. The legend emphasis goes through the pointed-mark store
 * ({@link MapPointedStore}). An overlay renders nothing until its id gains a
 * color: the beat after its registration effect runs.
 *
 * @internal
 */
export type MapPlatContextValue = {
	/** Projects lon/lat to frame coordinates; `null` off the projection (US-composite insets). */
	project: MapProjector
	/** Registers an overlay's legend entry; returns the unregister cleanup. */
	register: (entry: MapOverlayEntry) => () => void
	/** Resolved slot color per registered entry id; marks derive their paint from it. */
	colors: ReadonlyMap<string, MapSeriesColor>
	/** Registration ordinal per entry id, so a mount reveal can stagger by it. */
	order: ReadonlyMap<string, number>
	/** Legend ids toggled off; a hidden overlay unmounts its marks. */
	hidden: ReadonlySet<string>
	/**
	 * The resolver of how much reach the drawn zones leave a mark at a frame
	 * position, in device pixels. It is the tightest budget any registered zone the legend still shows
	 * will allow. A dot standing over two of them has to satisfy both.
	 * `Infinity` where nothing claims that ground, which `markTargets` caps. This
	 * layer states the claim and never the size a target settles at. A dot reads it
	 * to size its own target.
	 *
	 * A REGION layer that answers the pointer claims it too, and on the same terms.
	 * A finger-sized target over a shape that reads out, answers clicks, or opens a
	 * menu puts that shape out of reach where the dot stands. The dot therefore
	 * takes a share of what the region itself holds, and the region keeps the rest.
	 * Touch keeps the whole target; see the resolver.
	 *
	 * The scale rides in because of that half. A region is measured in frame units
	 * where a zone's budget converted at the mark that registered it. This resolver
	 * cannot make the conversion itself. `MapZoomScaleContext` sits below the plat,
	 * around the plot alone, so a wheel notch re-renders the marks without
	 * re-rendering the plat. The parameter stops here. `useMapOverlay` binds it,
	 * and every reader below takes the one-measure shape every other claimant has.
	 *
	 * Resolved here rather than by each dot, because the question is about the
	 * plat's whole ledger and the answer changes with the legend. It reads the
	 * budget that each zone committed last. See {@link MapOverlayEntry.spare} for
	 * why that read is stable.
	 *
	 * A store rather than a resolver in the value, for the reason {@link pool} is
	 * one. A zone whose ground changes in place or after a refit changes nothing
	 * the value holds. The zone therefore regrounds the store after it commits its
	 * new budget, and each dot measures its target again before the change paints.
	 */
	spare: MapSpareStore
	/**
	 * Every visible dot-drawing mark's dots, in frame units. A dot measures its pointer target's ground
	 * against them, so two marks standing on top of one another divide it instead of overlapping.
	 *
	 * Pooled here for the same reason {@link spare} is: the question is about the plat's whole ledger
	 * and the answer changes with the legend. A mark that sees only its own dots keeps a full target
	 * beside another mark, and the overlap goes to the mark that draws last.
	 *
	 * Positions rather than a measure, which is what makes pooling possible at all. Every reach in the
	 * crowding rule is a device-pixel one, and the plat cannot see the zoom scale.
	 * `MapZoomScaleContext` sits below it, around the plot alone, so a wheel notch re-renders the marks
	 * and not the legend or the region layer. Frame units are scale-free, so the plat supplies the
	 * geometry and the mark applies its own `unitsPerPixel`.
	 *
	 * A store rather than a resolver in the value. A mark that moves changes nothing the value holds,
	 * so the mark restakes its own dots, and only the other readers of the pool render again. The
	 * snapshot excludes the asking mark, by id: a mark's own dots are its own business, and it holds
	 * them in drawn form already. The pool also excludes hidden marks and each mark that draws no
	 * dot. Thus the waypoints of a route and the ring of a zone never contest ground that they paint
	 * nothing on.
	 */
	pool: MapDotPool
	/**
	 * The shared pass of every {@link MapPoints} that clusters (`sets.ts`). Each set
	 * reads its own groups from one pass over all of them. Thus two sets never draw
	 * over one another, and a summary can hold the dots of more than one set.
	 *
	 * A store, for the reason {@link pool} is one. The pass reads the zoom scale,
	 * which the plat cannot see. Thus the snapshot takes the scale from the set
	 * that reads it, and holds the grouping of that scale.
	 */
	clusters: MapClusterStore
	/**
	 * Reports a pick (`activate`) or a right-click (`menu`) on an overlay target.
	 * Each part that the target names (`targetParts`) gets the report through the
	 * reporter of its own set. A shared summary reports its click through it, so a pick from any
	 * input reaches every part of the summary by one rule. A stable function.
	 */
	report: {
		(target: MapOverlayTarget, kind: 'activate', press: ChartPress): void
		(target: MapOverlayTarget, kind: 'menu'): void
	}
	/**
	 * The moves of the marks, for the keyboard cursor. A mark calls `move` when
	 * its stops change, and the cursor resolves its stop list again. One store for
	 * the life of the plat.
	 */
	moves: MapStopMoves
	/** The picked mark, by the plat's own prop name; the named mark haloes the stop it resolves to. */
	selectedOverlay: MapOverlaySelection | null
	/** Whether the plat animates; overlays pick their motion renderers off it. */
	animate: boolean
	/**
	 * The canonical frame, in frame units, while the box is not measured: on the
	 * server, and in the hydration render. `null` once the box is measured.
	 *
	 * The frame then scales to meet a box that no render knows. A mark whose
	 * drawing depends on the width in pixels draws for every width at once, and a
	 * container query on the plot shows the drawing of the width that the box has
	 * (`MapPoints`). The plot is the container `map-plot`, so a mark can read the
	 * size of the box in a container query and in `cq` units.
	 */
	unmeasured: { width: number; height: number } | null
}

export const [MapPlatContext, useMapPlat] = createContext<MapPlatContextValue>('MapPlat')
