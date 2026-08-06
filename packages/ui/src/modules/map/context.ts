'use client'

import { createContext } from '../../core'
import type { MapSeriesColor } from '../../recipes/kata/map'
import type { MapPoint2D } from './map-geometry'
import type { LngLat, MapOverlaySelection } from './types'
import type { MapOverlayEntry } from './use-map-legend-registry'

/**
 * What the pointer is on: a region by feature index, or an overlay (route /
 * point / marker) by its registered legend id — the map's hover targets are
 * heterogeneous where a chart's are one category axis.
 *
 * @internal
 */
export type MapHoverTarget =
	| { kind: 'region'; index: number }
	| {
			kind: 'entry'
			id: string
			/**
			 * Which of the mark's stops, for a mark that draws more than one — a
			 * {@link MapPoints} dot. A singular mark carries `0`, so an entry target
			 * always has a stop and no reader tests for its absence.
			 */
			stop: number
	  }

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
 * The region index under a DOM node, resolved from the `data-region-index`
 * anchor the region paths carry — the one place that reads that anchor, shared
 * by the hover provider's scroll-settle resolve and the region layer's own
 * delegated handlers, so the contract can't drift between them.
 *
 * `null` whenever the node is outside every region, or the anchor doesn't read
 * as an index: a missing attribute must never coerce to region 0 — `Number(null)`
 * is `0` — and a malformed one must never report `NaN` as a target.
 *
 * @internal
 */
export function regionIndexAt(node: EventTarget | Element | null): number | null {
	if (!(node instanceof Element)) return null

	const anchor = node.closest('[data-region-index]')

	if (anchor === null) return null

	const raw = anchor.getAttribute('data-region-index')

	if (raw === null) return null

	return wholeNumber(raw)
}

/**
 * The overlay mark under a DOM node: its id, and which of its stops the node
 * covers. The twin of {@link regionIndexAt} over the `data-entry-id` /
 * `data-entry-stop` pair the hit shapes carry, and the one place that reads
 * them — the hover provider's scroll-settle resolve and the marks' own pointer
 * handlers must never disagree about which dot is under the pointer.
 *
 * A stop that does not read as a whole number falls back to `0` rather than
 * `NaN`: the mark itself is what the anchor found, so its first stop is the
 * honest answer where the ordinal is missing or malformed.
 *
 * @internal
 */
export function markAnchorAt(
	node: EventTarget | Element | null,
): { id: string; stop: number } | null {
	if (!(node instanceof Element)) return null

	const anchor = node.closest('[data-entry-id]')

	const id = anchor?.getAttribute('data-entry-id') ?? null

	if (id === null) return null

	return { id, stop: wholeNumber(anchor?.getAttribute('data-entry-stop') ?? null) ?? 0 }
}

/** A DOM anchor's value as a whole number, or `null` where it is missing or malformed. */
function wholeNumber(raw: string | null): number | null {
	if (raw === null) return null

	const value = Number(raw)

	return Number.isInteger(value) && value >= 0 ? value : null
}

/** Whether two hover targets name the same mark, so a redundant write can bail. @internal */
export function sameTarget(a: MapHoverTarget | null, b: MapHoverTarget | null): boolean {
	if (a === b) return true

	if (a === null || b === null || a.kind !== b.kind) return false

	return sameMark(a, b) && (a.kind === 'region' || a.stop === (b as { stop: number }).stop)
}

/**
 * Whether two targets name the same *mark*, ignoring which of its stops. The
 * whole of a plural mark reads as one thing to the emphasis — pointing one dot
 * of a {@link MapPoints} lights the group, not that dot alone — which is what
 * lets the group draw under a single wrapper and a single dim class where two
 * hundred dots would otherwise need two hundred.
 *
 * {@link sameTarget} is this plus the stop, so a third target kind is added
 * here once rather than in two comparisons that must agree.
 *
 * @internal
 */
export function sameMark(a: MapHoverTarget | null, b: MapHoverTarget | null): boolean {
	if (a === b) return true

	if (a === null || b === null || a.kind !== b.kind) return false

	return a.kind === 'region'
		? a.index === (b as { index: number }).index
		: a.id === (b as { id: string }).id
}

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
 * Whether a mark reads dimmed under the shared emphasis: the pointed mark
 * recedes everything but itself, else the legend's focused id dims marks
 * outside its group (`groupId` — an overlay's own entry id, a region's
 * category id), else nothing dims. The pointed mark winning over a still-held
 * legend focus mirrors the chart's mark-emphasis resolution.
 *
 * @internal
 */
export function mapMarkDimmed(
	pointed: MapHoverTarget | null,
	self: MapHoverTarget,
	emphasis: string | null,
	groupId: string | null,
): boolean {
	// Compared by mark, not by stop: a plural mark draws under one wrapper, so
	// pointing one of its dots must light the whole group rather than dim the rest
	// of itself.
	if (pointed !== null) return !sameMark(pointed, self)

	return emphasis !== null && emphasis !== groupId
}

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
	/** The picked mark, `null` when nothing is picked; the named mark haloes the stop it resolves to. */
	selected: MapOverlaySelection | null
	/** Whether the plat animates; overlays pick their motion renderers off it. */
	animate: boolean
}

export const [MapPlatContext, useMapPlat] = createContext<MapPlatContextValue>('MapPlat')
