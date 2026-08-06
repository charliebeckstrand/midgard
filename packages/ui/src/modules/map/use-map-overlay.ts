'use client'

import { type PointerEvent, useCallback, useEffect, useId, useRef } from 'react'
import { cn } from '../../core'
import { k, type MapSeriesColor } from '../../recipes/kata/map'
import { mapMarkDimmed, useMapHoverSet, useMapPlat, useMapPointedMark } from './context'
import type { MapPoint2D } from './map-geometry'
import type { LngLat } from './types'
import type { MapOverlayKind } from './use-map-legend-registry'

/**
 * The props every overlay mark shares: its identity, its legend text and paint,
 * and the pointer reporters. {@link MapRoute}, {@link MapPoint}, and
 * {@link MapMarker} each add their own geometry to these.
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
	/** Legend and tooltip name; one entry per mark. */
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

/** What an overlay hands {@link useMapOverlay} beyond its shared props. @internal */
type MapOverlayConfig = MapOverlayProps & {
	kind: MapOverlayKind
	/** Swatch shape, mirroring the mark: `line` for routes and markers, `dot` for points. */
	swatch: 'line' | 'dot'
	/**
	 * Where the keyboard cursor anchors on this mark, in lon/lat — a point's own
	 * position, a route's middle stop, a marker's origin. `null` while the mark
	 * has no geometry yet.
	 */
	anchor: LngLat | null
}

/** The resolved plat state and DOM props an overlay draws itself from. @internal */
export type MapOverlay = {
	/** The slot colour, `undefined` until registration lands — the mark renders nothing meanwhile. */
	slot: MapSeriesColor | undefined
	/** Whether the legend has toggled this mark off. */
	hidden: boolean
	/** Projects lon/lat to frame coordinates; `null` off the projection. */
	project: (position: LngLat) => MapPoint2D | null
	/** Whether the plat animates; the mark picks its motion renderers off it. */
	animate: boolean
	/** Registration ordinal, so a mount reveal can stagger by it. */
	order: number
	/** The dim class for the mark's group, under the shared emphasis. */
	dim: string
	/** Clears the hover as the pointer leaves the mark's group. */
	onPointerLeave: () => void
	/**
	 * Spread onto every invisible hit shape the mark draws: the entry anchor the
	 * scroll-settle resolve reads, the hover tracker, and the click reporters with
	 * their cursor affordance.
	 */
	hit: {
		'data-entry-id': string
		className: string | undefined
		onPointerEnter: (event: PointerEvent<SVGElement>) => void
		onPointerMove: (event: PointerEvent<SVGElement>) => void
		onClick: (() => void) | undefined
		onContextMenu: (() => void) | undefined
	}
}

/**
 * The plumbing every overlay mark shares: identity, legend registration, the
 * resolved paint and toggle state, the hover tracker, and the click reporters.
 * Each overlay keeps only its own geometry and its own drawn shapes.
 *
 * The mark registers its keyboard anchor and its activation alongside its legend
 * entry, so the plat's cursor can step onto it and Enter can pick it without the
 * plat knowing what kind of mark it is. Both ride stable getters over a ref, so
 * a moving mark — or an inline `at={[lon, lat]}` — never re-registers.
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
	anchor,
}: MapOverlayConfig): MapOverlay {
	const generated = useId()

	const id = given ?? generated

	const { project, register, colors, order, hidden, emphasis, animate } = useMapPlat()

	const set = useMapHoverSet()

	const pointed = useMapPointedMark()

	// The live anchor and reporters, read at fire time rather than captured in the
	// registration: a consumer's inline handler is a fresh identity every render,
	// and a mark's position changes as its geometry lands — neither may churn the
	// ledger, whose every write re-sorts it and re-renders the legend.
	const live = useRef({ anchor, onClick })

	live.current = { anchor, onClick }

	const anchorAt = useCallback(() => live.current.anchor, [])

	const pick = useCallback(() => live.current.onClick?.(id), [id])

	// Registered only where the mark answers a pick, so its presence is the
	// question the plat's tab-stop gate asks. The handler itself still rides the
	// ref — this depends on whether there is one, a boolean that changes only when
	// a consumer adds or drops the prop.
	const pickable = onClick !== undefined

	const activate = pickable ? pick : undefined

	useEffect(
		() => register({ id, label, kind, swatch, color, detail, anchorAt, activate }),
		[register, id, label, kind, swatch, color, detail, anchorAt, activate],
	)

	const track = (event: PointerEvent<SVGElement>) => {
		set({ kind: 'entry', id }, { x: event.clientX, y: event.clientY })
	}

	return {
		slot: colors.get(id),
		hidden: hidden.has(id),
		project,
		animate,
		order: order.get(id) ?? 0,
		dim: cn(k.group(mapMarkDimmed(pointed, { kind: 'entry', id }, emphasis, id))),
		onPointerLeave: () => set(null, null),
		hit: {
			'data-entry-id': id,
			className: pickable ? k.clickable : undefined,
			onPointerEnter: track,
			onPointerMove: track,
			onClick: onClick === undefined ? undefined : () => onClick(id),
			// Bubbles, and never prevents default: a wrapping menu still opens, and
			// this only names which mark it opened over.
			onContextMenu: onContextMenu === undefined ? undefined : () => onContextMenu(id),
		},
	}
}
