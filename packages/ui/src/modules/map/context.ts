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
 * Hover state shared between the map's marks and the tooltip: the pointed
 * target, and the pointer's viewport coordinates the tooltip anchors to.
 * Confined to its own context so pointer movement re-renders only the
 * tooltip — never the region paths.
 *
 * @internal
 */
export type MapHover = {
	/** The hovered target, or `null` when the pointer is away. */
	target: MapHoverTarget | null
	/** The pointer's client (viewport) coordinates while hovering, `null` at rest. */
	point: MapPoint2D | null
	/** Moves the hover, or clears it with `null`s. */
	set: (target: MapHoverTarget | null, point: MapPoint2D | null) => void
}

export const [MapHoverContext, useMapHover] = createContext<MapHover>('MapHover')

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
