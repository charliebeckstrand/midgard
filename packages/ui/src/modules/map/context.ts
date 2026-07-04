'use client'

import { createContext } from '../../core'
import type { MapSeriesColor } from '../../recipes/kata/map'
import type { MapPoint2D } from './map-geometry'
import type { LngLat } from './types'
import type { MapOverlayEntry } from './use-map-legend-registry'

/**
 * What the pointer is on: a region by feature index, or an overlay (route /
 * point / marker) by its registered legend id — the map's hover targets are
 * heterogeneous where a chart's are one category axis.
 *
 * @internal
 */
export type MapHoverTarget = { kind: 'region'; index: number } | { kind: 'entry'; id: string }

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
 * What {@link MapPlat} provides its overlay children: the fitted projection
 * as a closure, legend registration, the resolved slot colour per registered
 * entry, and the legend's toggle / emphasis state. An overlay renders
 * nothing until its id gains a colour — the beat after its registration
 * effect runs.
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
	/** Whether the plat animates; overlays pick their motion renderers off it. */
	animate: boolean
}

export const [MapPlatContext, useMapPlat] = createContext<MapPlatContextValue>('MapPlat')
