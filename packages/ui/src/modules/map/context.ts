'use client'

import { createContext } from '../../core'
import type { MapSeriesColor } from '../../recipes/kata/map'
import type { MapHoverTarget } from './engine/map-hover/target'
import type { MapOverlayEntry } from './engine/map-overlay/entry'
import type { LngLat, MapOverlaySelection, MapPoint2D } from './engine/types'
import type { MapZoom } from './use-map-zoom'

/**
 * The live hover readout the tooltip anchors to: the pointed target and the
 * pointer's viewport coordinates. Split from the {@link MapHoverSet} mover into
 * its own context so pointer movement — which churns this value every frame —
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

/**
 * Moves the hover, or clears it with `null`s. A stable identity held apart from
 * {@link MapHoverState}, so a mark reading it to report its own hover never
 * re-renders when the pointer moves elsewhere.
 *
 * @internal
 */
export type MapHoverSet = (target: MapHoverTarget | null, point: MapPoint2D | null) => void

export const [MapHoverStateContext, useMapHoverState] =
	createContext<MapHoverState>('MapHoverState')

export const [MapHoverSetContext, useMapHoverSet] = createContext<MapHoverSet>('MapHoverSet')

/**
 * The mark the pointer sits on — a region or an overlay entry — taking the
 * emphasis, so everything else on the map recedes behind it: the map's twin of
 * the chart's pointed-mark emphasis. Derived from the hover target but held
 * apart from {@link MapHoverState}: the hover provider pins the target's
 * identity across a same-mark move, so this value — and every mark reading
 * it — changes only on a discrete crossing, never as the pointer travels.
 * A region whose category is unmatched or toggled off never takes it, the
 * same silence the tooltip keeps off data. Defaults to `null` so a mark
 * rendered outside the provider reads lit.
 *
 * @internal
 */
export const [MapPointedMarkContext, useMapPointedMark] = createContext<MapHoverTarget | null>(
	'MapPointedMark',
	{ default: null },
)

/**
 * The view transform and its gestures, or `null` on a map that does not zoom —
 * one encoding of that bit, which the layer, the plot region, and the keyboard
 * cursor all test the same way. Provided by {@link MapZoomProvider}, which sits
 * below the plat so a gesture never re-renders it.
 *
 * @internal
 */
export const [MapZoomContext, useMapZoomView] = createContext<MapZoom | null>('MapZoom', {
	default: null,
})

/**
 * What one device pixel spans in frame units under the plat's zoom: `1` at the
 * fit, and `1 / k` under a transform. It is the marks' one reading of the zoom,
 * and the whole of it — a mark converts a pixel spec to frame units by one
 * multiply and never asks what the transform is.
 *
 * Held apart from {@link MapPlatContextValue} because a zoom step churns this
 * value on every wheel notch: the marks that answer it (the dots' hit circles,
 * their cluster reach, and the count inside a summary) re-render per notch, and
 * the region layer, the legend, and the plat above them all hold. Defaults to
 * `1`, so a mark rendered outside a zooming plat reads the frame as device
 * pixels — which every settled unzoomed frame is.
 *
 * @internal
 */
export const [MapZoomScaleContext, useMapZoomScale] = createContext<number>('MapZoomScale', {
	default: 1,
})

/**
 * What {@link MapPlat} provides its overlay children: the fitted projection
 * as a closure, legend registration, the resolved slot colour per registered
 * entry, the legend's toggle / emphasis state, and the standing pick. An
 * overlay renders nothing until its id gains a colour — the beat after its
 * registration effect runs.
 *
 * @internal
 */
export type MapPlatContextValue = {
	/** Projects lon/lat to frame coordinates; `null` off the projection (US-composite insets). */
	project: (position: LngLat) => MapPoint2D | null
	/** Registers an overlay's legend entry; returns the unregister cleanup. */
	register: (entry: MapOverlayEntry) => () => void
	/** Resolved slot colour per registered entry id; marks derive their paint from it. */
	colors: ReadonlyMap<string, MapSeriesColor>
	/** Registration ordinal per entry id, so a mount reveal can stagger by it. */
	order: ReadonlyMap<string, number>
	/** Legend ids toggled off; a hidden overlay unmounts its marks. */
	hidden: ReadonlySet<string>
	/** The legend id under emphasis; marks outside its group dim. */
	emphasis: string | null
	/** The picked mark, by the plat's own prop name; the named mark haloes the stop it resolves to. */
	selectedOverlay: MapOverlaySelection | null
	/** Whether the plat animates; overlays pick their motion renderers off it. */
	animate: boolean
}

export const [MapPlatContext, useMapPlat] = createContext<MapPlatContextValue>('MapPlat')
