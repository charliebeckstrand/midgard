'use client'

import { type MouseEvent, type PointerEvent, useCallback, useEffect, useId, useRef } from 'react'
import { cn } from '../../core'
import { k, type MapSeriesColor } from '../../recipes/kata/map'
import { useMapHoverSet, useMapPlat, useMapPointedMark, useMapZoomScale } from './context'
import { markAnchorAt } from './engine/map-hover/anchor'
import { mapMarkDimmed } from './engine/map-hover/target'
import type { MapOverlayKind, MapStopRow } from './engine/map-overlay/entry'
import { ownStop, pickedStop } from './engine/map-overlay/selection'
import type { LngLat, MapPoint2D, MapSwatchShape } from './engine/types'

/**
 * The props every overlay mark shares: its identity, its legend text and paint,
 * and the pointer reporters. {@link MapRoute}, {@link MapPoint},
 * {@link MapMarker}, and {@link MapPoints} each add their own geometry to these.
 */
export type MapOverlayProps = {
	/**
	 * Stable identity for the mark, reported by {@link onClick} and
	 * {@link onContextMenu} so a click keys straight into the caller's own rows —
	 * the overlays' twin of a region's `regionId`.
	 *
	 * It is also the legend key, so an explicit id survives a remount: the mark
	 * keeps its slot colour and its toggled-off state where a generated one would
	 * register afresh. Must be unique within the plat. Omitted, the mark generates
	 * its own and the identity the reporters hand back is opaque but still stable
	 * for the mount.
	 */
	id?: string
	/** Legend and tooltip name; one entry per mark, however many shapes it draws. */
	label: string
	/** Named mark colour override; defaults to the next slot after the region categories. */
	color?: MapSeriesColor
	/** A trailing readout in the legend and tooltip — a count, a status, a mileage. */
	detail?: string
	/**
	 * Fires when a click lands on the mark — anywhere on its hit shape, the same
	 * target the tooltip reads — with the mark's {@link id}. `MapPlat`'s
	 * `onRegionClick` in the same shape, so a map whose regions and overlays are
	 * both pickable reports both the one way.
	 *
	 * Set, the mark carries a pointer cursor. The keyboard reaches it through the
	 * plot region's own cursor, which visits every overlay alongside the regions
	 * and activates the one it sits on with Enter or Space.
	 *
	 * A singular mark holds one stop, so it is called with a trailing `0` its type
	 * omits — the plural {@link MapPoints} passes the dot's index there. A handler
	 * declared as this type never sees the argument.
	 *
	 * Handing the reported pair back as `MapPlat`'s `selectedOverlay` haloes the
	 * pick, the way `selectedRegion` rings a picked region.
	 */
	onClick?: (id: string) => void
	/**
	 * Fires when a right-click lands on the mark, with the same identity
	 * {@link onClick} reports — for a context menu wrapping the map that needs to
	 * name what it opened over. Takes no pointer affordance and never prevents
	 * default, so the menu still opens.
	 */
	onContextMenu?: (id: string) => void
}

/**
 * The reporters as the hook takes them, naming the stop as well as the mark. A
 * singular mark's public `(id) => void` is assignable to this, so it passes its
 * own prop straight through and never sees the stop it does not have.
 *
 * @internal
 */
type MapOverlayReporters = {
	onClick?: (id: string, stop: number) => void
	onContextMenu?: (id: string, stop: number) => void
}

/** What an overlay hands {@link useMapOverlay} beyond its shared props. @internal */
type MapOverlayConfig = Omit<MapOverlayProps, 'onClick' | 'onContextMenu'> &
	MapOverlayReporters & {
		kind: MapOverlayKind
		swatch: MapSwatchShape
		/**
		 * Where the keyboard cursor can stand on this mark, in lon/lat — a point's
		 * own position, a route's middle stop, every dot of a plural mark. Empty
		 * while the mark has no geometry yet.
		 *
		 * A thunk, so a plural mark's O(N) build lands on the one keypress that
		 * reads it rather than on every render.
		 */
		stops: () => LngLat[]
		/**
		 * Per-dot readouts for a plural mark, absent on a singular one. Plain data,
		 * because the table draws it — see {@link MapOverlayEntry.stopRows}. Keyed
		 * by content below, so an inline `points` never loops the ledger.
		 */
		stopRows?: MapStopRow[]
		/**
		 * Which drawn stop holds a reported index, where the mark's clicks count in
		 * another space than its stops — see {@link MapOverlayEntry.stopOf}. Passed
		 * live rather than through the ref the registration rides, because the
		 * grouping behind it answers the drawn frame: a refit that regroups must
		 * move the halo with it.
		 */
		stopOf?: (index: number) => number | null
	}

/** The resolved plat state and DOM props an overlay draws itself from. @internal */
export type MapOverlay = {
	/** The slot colour, `undefined` until registration lands — the mark renders nothing meanwhile. */
	slot: MapSeriesColor | undefined
	/** Whether the legend has toggled this mark off. */
	hidden: boolean
	/** Projects lon/lat to frame coordinates; `null` off the projection. */
	project: (position: LngLat) => MapPoint2D | null
	/**
	 * What one device pixel spans in frame units under the plat's zoom — `1` at
	 * rest. Every pixel spec a mark draws in frame units rather than in a
	 * non-scaling stroke multiplies by it: the hit circles, and a summary's count.
	 * Published here so a mark reads the rule off the seam it already consumes,
	 * rather than each one remembering to reach for the scale itself.
	 */
	unitsPerPixel: number
	/** Whether the plat animates; the mark picks its motion renderers off it. */
	animate: boolean
	/** Registration ordinal, so a mount reveal can stagger by it. */
	order: number
	/** The dim class for the mark's group, under the shared emphasis. */
	dim: string
	/**
	 * Which of the mark's drawn stops the plat holds selected, `null` when the
	 * pick names another mark — or a stop this one does not draw. A singular mark
	 * reads it as a flag; a plural one haloes the dot it names.
	 */
	selected: number | null
	/** Clears the hover as the pointer leaves the mark's group. */
	onPointerLeave: () => void
	/**
	 * Props for one invisible hit shape, named by which of the mark's stops it
	 * covers — `0` for a singular mark. Carries the anchor the scroll-settle
	 * resolve reads, the hover tracker, and the click reporters with their cursor
	 * affordance.
	 */
	hit: (stop?: number) => {
		'data-entry-id': string
		'data-entry-stop': number
		className: string | undefined
		onPointerEnter: (event: PointerEvent<SVGElement>) => void
		onPointerMove: (event: PointerEvent<SVGElement>) => void
		onClick: ((event: MouseEvent<SVGElement>) => void) | undefined
		onContextMenu: ((event: MouseEvent<SVGElement>) => void) | undefined
	}
}

/**
 * The plumbing every overlay mark shares: identity, legend registration, the
 * resolved paint and toggle state, the hover tracker, and the click reporters.
 * Each overlay keeps only its own geometry and its own drawn shapes.
 *
 * The mark registers its keyboard stops and its activation alongside its legend
 * entry, so the plat's cursor can step onto it and Enter can pick it without the
 * plat knowing what kind of mark it is. A mark may hold more than one stop —
 * every dot of a {@link MapPoints} — and the cursor, the tooltip, and the click
 * all name the stop, while the legend, the toggle, and the emphasis stay with
 * the mark as a whole.
 *
 * The stops and the reporters ride stable getters over a ref, so a moving mark —
 * or an inline handler — never re-registers.
 *
 * @internal
 */
export function useMapOverlay({
	id: given,
	label,
	color,
	detail,
	onClick,
	onContextMenu,
	kind,
	swatch,
	stops,
	stopRows,
	stopOf,
}: MapOverlayConfig): MapOverlay {
	const generated = useId()

	const id = given ?? generated

	const { project, register, colors, order, hidden, emphasis, animate, selectedOverlay } =
		useMapPlat()

	const set = useMapHoverSet()

	const pointed = useMapPointedMark()

	const unitsPerPixel = useMapZoomScale()

	// The mark's own stop resolution, defaulted once: a mark that draws the stops
	// it reports holds one, its own. Spelling the fallback here rather than at each
	// reader is what makes the halo below and the plat's picked row the same
	// question — the drift `engine/map-overlay/selection.ts` exists to prevent.
	const resolveStop = stopOf ?? ownStop

	// The live stops and reporters, read at fire time rather than captured in the
	// registration: a consumer's inline handler is a fresh identity every render,
	// and a mark's geometry changes as it lands — neither may churn the ledger,
	// whose every write re-sorts it and re-renders the legend.
	const live = useRef({ stops, onClick, stopRows, resolveStop })

	live.current = { stops, onClick, stopRows, resolveStop }

	const stopsAt = useCallback(() => live.current.stops(), [])

	const stopAt = useCallback((index: number) => live.current.resolveStop(index), [])

	const pick = useCallback((stop: number) => live.current.onClick?.(id, stop), [id])

	// Registered only where the mark answers a pick, so its presence is the
	// question the plat's tab-stop gate asks. The handler itself still rides the
	// ref — this depends on whether there is one, a boolean that changes only when
	// a consumer adds or drops the prop.
	const pickable = onClick !== undefined

	const activate = pickable ? pick : undefined

	// The standing pick, resolved off the live mapper rather than the ref the
	// ledger rides: a refit that regroups a plural mark moves the picked dot, and
	// the halo has to move with it on that same render. The table resolves the
	// picked row through this same mapper, so the halo and that row can't disagree.
	const selected = pickedStop(selectedOverlay, id, resolveStop)

	// The readout text is the one registered field the table draws, so it has to
	// reach the ledger to reach the screen. Keyed by content rather than by the
	// array's identity: an inline `points` would otherwise re-register on every
	// render, and each registration re-renders this mark — a loop.
	const rowsKey = stopRows
		?.map((row) => `${row.label ?? ''}\u001f${row.detail ?? ''}`)
		.join('\u001e')

	// biome-ignore lint/correctness/useExhaustiveDependencies: `stopRows` is keyed by `rowsKey`, its content
	useEffect(
		() =>
			register({
				id,
				label,
				kind,
				swatch,
				color,
				detail,
				stopsAt,
				stopRows,
				activate,
				stopOf: stopAt,
			}),
		[register, id, label, kind, swatch, color, detail, stopsAt, rowsKey, activate, stopAt],
	)

	// One handler set per mark, not one per hit shape: each reads its own stop
	// back off the element it fired on, through the same anchor the scroll-settle
	// resolve reads. A plural mark draws one shape per dot, so building these per
	// shape would allocate them by the hundred on every render.
	const stopFrom = (event: { currentTarget: Element }) =>
		markAnchorAt(event.currentTarget)?.stop ?? 0

	const track = (event: PointerEvent<SVGElement>) => {
		set({ kind: 'entry', id, stop: stopFrom(event) }, { x: event.clientX, y: event.clientY })
	}

	const handlers = {
		onPointerEnter: track,
		onPointerMove: track,
		onClick: pickable
			? (event: MouseEvent<SVGElement>) => onClick?.(id, stopFrom(event))
			: undefined,
		// Bubbles, and never prevents default: a wrapping menu still opens, and this
		// only names which mark it opened over.
		onContextMenu:
			onContextMenu === undefined
				? undefined
				: (event: MouseEvent<SVGElement>) => onContextMenu(id, stopFrom(event)),
	}

	return {
		slot: colors.get(id),
		hidden: hidden.has(id),
		project,
		unitsPerPixel,
		animate,
		order: order.get(id) ?? 0,
		dim: cn(k.group(mapMarkDimmed(pointed, { kind: 'entry', id, stop: 0 }, emphasis, id))),
		selected,
		onPointerLeave: () => set(null, null),
		hit: (stop = 0) => ({
			'data-entry-id': id,
			'data-entry-stop': stop,
			className: pickable ? k.clickable : undefined,
			...handlers,
		}),
	}
}
