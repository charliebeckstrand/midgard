'use client'

import {
	type MouseEvent,
	type PointerEvent,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
} from 'react'
import { cn } from '../../core'
import { k, type MapSeriesColor } from '../../recipes/kata/map'
import { useMapHoverSet, useMapPlat, useMapPointedMark, useMapZoomScale } from './context'
import { markAnchorAt } from './engine/map-hover/anchor'
import { mapMarkDimmed } from './engine/map-hover/target'
import type { MapOverlayKind, MapStopRow } from './engine/map-overlay/entry'
import { ownStop, pickedStop } from './engine/map-overlay/selection'
import type { LngLat, MapPoint2D, MapSwatchShape } from './engine/types'

/** The stop a hit shape names, read back off the element the event fired on. @internal */
function stopFrom(event: { currentTarget: Element }): number {
	return markAnchorAt(event.currentTarget)?.stop ?? 0
}

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
		 * How much reach this mark leaves a dot standing on it — see
		 * {@link MapOverlayEntry.spare}. Passed by the area-shaped marks alone, and
		 * read live like {@link stops}, so a redrawn zone never re-registers.
		 */
		spare?: (at: MapPoint2D) => number
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

/**
 * The DOM props one of a mark's hit shapes spreads — {@link MapOverlay.hit}'s
 * return. Named here so the hit-props factories take exactly what a mark
 * produces and nothing a caller could widen the target with, and named once so
 * the dot's factory and the line's read one type.
 *
 * @internal
 */
export type MapOverlayHit = ReturnType<MapOverlay['hit']>

/** The resolved plat state and DOM props an overlay draws itself from. @internal */
export type MapOverlay = {
	/** The slot colour, `undefined` until registration lands — the mark renders nothing meanwhile. */
	slot: MapSeriesColor | undefined
	/** Whether the legend has toggled this mark off. */
	hidden: boolean
	/**
	 * How much reach the drawn zones leave a mark at a position — the plat's whole
	 * ledger asked at one point, tightest budget winning. A dot-shaped mark reads
	 * it per dot to size its hit target: a dot gives a zone only as much room as
	 * that zone can spare, and takes it all back the moment the legend puts the
	 * zone away.
	 */
	spare: (at: MapPoint2D) => number
	/** Projects lon/lat to frame coordinates; `null` off the projection. */
	project: (position: LngLat) => MapPoint2D | null
	/**
	 * What one device pixel spans in frame units under the plat's zoom — `1` at
	 * rest. Every pixel spec a mark draws multiplies by it: its stroke widths,
	 * its hit shapes, and a summary's count. Published here so a mark reads the
	 * rule off the seam it already consumes, rather than each one remembering to
	 * reach for the scale itself. `MapZoomScaleContext` states the rule.
	 */
	unitsPerPixel: number
	/**
	 * Asks for every OTHER visible dot-drawing mark's dots, in frame units — see
	 * {@link MapPlatContextValue.neighbours}. A dot-shaped mark divides its pointer target's ground
	 * against these, so two marks standing on top of one another no longer overlap.
	 *
	 * A resolver rather than the pool itself, and bound to this mark's id so the exclusion — the one
	 * part a mark could get wrong — is still not the mark's to state. Lazy because only a dot-shaped
	 * mark reads it and the pool invokes every other entry's `stopsAt`, which `MapPoints` registers as
	 * a thunk precisely so that pass lands on the one reader: resolved eagerly here, every mark would
	 * trigger that pass for every other mark — M² of them — and discard the answer in all M cases
	 * wherever no dot-shaped mark was mounted. Memoise the result at the call site; the resolver is
	 * stable until the plat's ledger, toggles or fit change.
	 */
	neighbours: () => MapPoint2D[]
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
	spare: ownSpare,
	stopRows,
	stopOf,
}: MapOverlayConfig): MapOverlay {
	const generated = useId()

	const id = given ?? generated

	const {
		project,
		register,
		colors,
		order,
		hidden,
		spare,
		neighbours,
		emphasis,
		animate,
		selectedOverlay,
	} = useMapPlat()

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
	const live = useRef({ stops, onClick, onContextMenu, resolveStop, ownSpare })

	live.current = { stops, onClick, onContextMenu, resolveStop, ownSpare }

	const stopsAt = useCallback(() => live.current.stops(), [])

	const neighboursOf = useCallback(() => neighbours(id), [neighbours, id])

	const spareAt = useCallback(
		// The identity of the minimum the plat folds these into, so the fallback and
		// the resolver state one rule rather than two. It cannot fire in fact — only a
		// mark that passed a resolver registers this wrapper — but a mark that claims
		// nothing and a mark that never claimed have to answer alike either way.
		(at: MapPoint2D) => live.current.ownSpare?.(at) ?? Number.POSITIVE_INFINITY,
		[],
	)

	const stopAt = useCallback((index: number) => live.current.resolveStop(index), [])

	const pick = useCallback((stop: number) => live.current.onClick?.(id, stop), [id])

	// Registered only where the mark answers a pick, so its presence is the
	// question the plat's tab-stop gate asks. The handler itself still rides the
	// ref — this depends on whether there is one, a boolean that changes only when
	// a consumer adds or drops the prop.
	const pickable = onClick !== undefined

	const activate = pickable ? pick : undefined

	// Registered only where the mark holds ground, on the same terms as `activate`:
	// its presence is what the plat's resolver asks of an entry, so a dot never
	// measures itself against a mark that holds no face. The wrapper rides the ref,
	// so this depends on whether there is one — a fact fixed per mark kind.
	const budget = ownSpare === undefined ? undefined : spareAt

	// The standing pick, resolved off the live mapper rather than the ref the
	// ledger rides: a refit that regroups a plural mark moves the picked dot, and
	// the halo has to move with it on that same render. The table resolves the
	// picked row through this same mapper, so the halo and that row can't disagree.
	const selected = pickedStop(selectedOverlay, id, resolveStop)

	// The readout text is the one registered field the table draws, so it has to
	// reach the ledger to reach the screen. Keyed by content rather than by the
	// array's identity: an inline `points` would otherwise re-register on every
	// render, and each registration re-renders this mark — a loop.
	//
	// Memoised on the array itself: a plural mark hands a memoised one, so the
	// join runs when its content can actually have changed rather than on each of
	// the pointed-mark crossings that re-render this hook. An inline array is
	// unchanged by the memo — it rebuilds either way, which is what the content
	// key is for.
	const rowsKey = useMemo(
		() => stopRows?.map((row) => `${row.label ?? ''}\u001f${row.detail ?? ''}`).join('\u001e'),
		[stopRows],
	)

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
				spare: budget,
				stopOf: stopAt,
			}),
		[register, id, label, kind, swatch, color, detail, stopsAt, rowsKey, activate, budget, stopAt],
	)

	const track = useCallback(
		(event: PointerEvent<SVGElement>) => {
			set({ kind: 'entry', id, stop: stopFrom(event) }, { x: event.clientX, y: event.clientY })
		},
		[set, id],
	)

	// The pointer's route to the reporter the keyboard already reaches through
	// `pick`: one spelling of the call, so an activation cannot come to mean two
	// different things depending on which input made it.
	const clickMark = useCallback((event: MouseEvent<SVGElement>) => pick(stopFrom(event)), [pick])

	// Bubbles, and never prevents default: a wrapping menu still opens, and this
	// only names which mark it opened over.
	const menuMark = useCallback(
		(event: MouseEvent<SVGElement>) => live.current.onContextMenu?.(id, stopFrom(event)),
		[id],
	)

	const menuable = onContextMenu !== undefined

	// One handler set per mark, not one per hit shape: each reads its own stop
	// back off the element it fired on, through the same anchor the scroll-settle
	// resolve reads. A plural mark draws one shape per dot, so building these per
	// shape would allocate them by the hundred on every render.
	//
	// The factory itself is held across renders, which is what lets a plural
	// mark's dots sit behind a memo — the memo holds, so the dots never call it
	// again at all. (Each call still returns a fresh object; nothing compares
	// those.) Both reporters ride the `live` ref for it: a consumer's inline
	// handler is a fresh identity every render, and what this depends on instead
	// is whether there is one at all — a boolean a consumer changes by adding or
	// dropping the prop.
	const hit = useCallback(
		(stop = 0) => ({
			'data-entry-id': id,
			'data-entry-stop': stop,
			className: pickable ? k.clickable : undefined,
			onPointerEnter: track,
			onPointerMove: track,
			onClick: pickable ? clickMark : undefined,
			onContextMenu: menuable ? menuMark : undefined,
		}),
		[id, pickable, track, clickMark, menuable, menuMark],
	)

	return {
		slot: colors.get(id),
		hidden: hidden.has(id),
		project,
		spare,
		// The resolver, left uncalled — see {@link MapOverlay.neighbours} for why it stays lazy.
		neighbours: neighboursOf,
		unitsPerPixel,
		animate,
		order: order.get(id) ?? 0,
		// Spread, not passed whole: `cn` memoises on string arguments and sends an
		// array straight to the merge, and this resolves per mark on every crossing.
		dim: cn(...k.group(mapMarkDimmed(pointed, { kind: 'entry', id, stop: 0 }, emphasis, id))),
		selected,
		onPointerLeave: () => set(null, null),
		hit,
	}
}
