/**
 * Map kata: object-literal surface for the geography map module. The series
 * palette, frame inks, readout inks, and reveal motion come from the kiso `zu`
 * bundle, which the chart kata reads too. The two data-viz modules read as one
 * colour system, and the CVD-validated slot order must never fork. The map's
 * own region tokens sit beside them:
 *
 * - The no-data fill.
 * - The surface-colour boundary seam.
 * - The frame chrome.
 * - The hover and de-emphasis treatments.
 */
import { mode } from '../../core/recipe'
import { kokkaku, type SeriesSlot, sen, ugoki, zu } from '../kiso'

const { palette, ink, motion } = zu

/** A named map mark colour: the eight categorical data-viz slots plus `zinc`. */
export type MapSeriesColor = SeriesSlot

/** The map's one pointer affordance, shared by the region layer and the overlay marks. */
const CLICKABLE = 'cursor-pointer'

/**
 * The map's one selection ink. Foreground ink, not a palette slot. A mark in one
 * of the eight categorical hues would read as a ninth category. The neutral
 * holds its contrast over every slot, over the no-data fill, and over the
 * geography an overlay draws across alike.
 */
const SELECTED = mode('stroke-zinc-900', 'dark:stroke-white')

export const k = {
	/**
	 * The pointer affordance on a mark that answers a click: an overlay's hit
	 * shape. It carries it per shape, because a mark draws at most three. The
	 * region layer instead rides one group over thousands of paths
	 * (`region.clickable`, the same token).
	 */
	clickable: CLICKABLE,
	/**
	 * Takes a mark's hit circle from the coarse reach its `r` attribute carries,
	 * down to the fine-pointer one. That coarse reach is 44px for a finger, WCAG
	 * 2.5.5's enhanced target. It is the one form an SVG shape allows, because only
	 * CSS can read the input modality. `dotHitProps` sets the radius itself on
	 * {@link k.hitRadius}, and carries this class on the dots that have ground to
	 * give back. A dot standing clear of every zone and every neighbour keeps the
	 * coarse target on both pointers.
	 *
	 * It is what lets a small area mark be pointed at. A `MapGeofence` drawn tight
	 * around a `MapPoint` sits wholly inside a finger-sized circle. Without this
	 * the dot claims the zone's whole face, and the two can never be told apart. The
	 * mouse target can sit under WCAG 2.5.8's 24px minimum deliberately, and
	 * `POINT_HIT_RADIUS_FINE` states why.
	 *
	 * The fallback is spelled out rather than read from that constant, because
	 * Tailwind scans source for whole class strings; `map-hit-target.test.tsx` pins
	 * the two together. It is the floor a budget can never take a target under —
	 * the radius a dot of the default size draws at.
	 */
	hitFine: 'pointer-fine:[r:var(--map-hit-radius,5.5px)]',
	/**
	 * The custom property {@link k.hitFine} reads its radius from: what the ground
	 * under the dot can spare it. That is divided by the plat's zoom scale, so the
	 * target holds one device-pixel size at every scale. Named here beside the
	 * class that reads it, so the setter and the reader hold one spelling.
	 */
	hitRadius: '--map-hit-radius',
	/**
	 * The standing pick's ink, on an overlay mark's halo. It is the same token the
	 * region ring takes (`region.selected`). One map therefore never marks its
	 * geography and its overlays in two different colours.
	 */
	selected: SELECTED,
	/** Shared data-viz palette from `zu`: the same slots, order, and validation as `kata/chart`. */
	series: palette.series,
	order: palette.order,
	/** Legend / tooltip label ink (HTML text; marks carry the colour, text never does). */
	label: ink.label,
	/** Tooltip value ink: the strong element, values lead. */
	value: ink.value,
	/** The map's own region tokens beside the shared data-viz palette. */
	region: {
		/** A region with no matching datum — and a toggled-off category's fallback. */
		empty: mode('fill-zinc-200', 'dark:fill-zinc-800'),
		/** Region boundary seam: the surface colour, so shared borders read as gaps. */
		border: mode('stroke-white', 'dark:stroke-zinc-900'),
		/** Pointer emphasis on the hovered region. */
		hover: 'hover:brightness-110',
		/**
		 * The pointer affordance on a clickable map's region layer. Every
		 * region is a target, so it rides the group and inherits down rather
		 * than repeating on thousands of paths. The same token as the shared
		 * {@link k.clickable} an overlay mark carries; kept here so the region
		 * layer reads its affordance beside its other paint.
		 */
		clickable: CLICKABLE,
		/**
		 * The region layer while its VALUES are still loading. The shapes are drawn and
		 * their numbers are not in yet, so every one of them holds the no-data fill.
		 *
		 * On the group, so it inherits to every path and thousands of regions carry no
		 * class of their own. That is the same reason the cursor rides the group. Gated
		 * to `motion-safe`, with a standing dim in its place for the reader who asked
		 * for less motion. It is never both, since the pulse already troughs to that
		 * opacity. That is the pair `kata/grid`'s `body.settling` and
		 * `kata/chat-message`'s `streaming` carry. A loading state that renders as
		 * nothing at all for that reader is the grey map this token exists to disambiguate.
		 *
		 * Distinct from {@link MapSkeleton}, which stands in for a plat with no ATLAS.
		 * There the frame is reserved and nothing is drawn. Here the geography is drawn,
		 * and only the paint is pending. Without this the two are indistinguishable on
		 * screen. A fully grey map reads as "nobody covers anywhere", which is a
		 * statement about coverage rather than about a request in flight.
		 */
		pending: [ugoki.css.pulse, 'motion-reduce:opacity-50'],
		/**
		 * The pointed region's lit copy carries the hover emphasis statically:
		 * it is the hovered region by definition, and `:hover` can't reach the
		 * pointer-events-none copy.
		 */
		pointed: 'brightness-110',
		/**
		 * The selected region's outline — the map's shared {@link k.selected} ink,
		 * kept here so the region layer reads its selection beside its other paint.
		 */
		selected: SELECTED,
	},
	/**
	 * The frame chrome, on the chart's own chrome inks. The graticule takes the
	 * gridline hairline, and the sphere outline the axis baseline. That is a step
	 * firmer, the relation the two hold on every chart. A dashboard's charts and
	 * maps therefore rule their frames in one ink. Both are recessive under the
	 * marks, and both draw beneath the regions.
	 */
	chrome: {
		/** Meridian and parallel hairlines: the chart gridline. */
		graticule: ink.grid,
		/** The globe's own edge: the chart's axis baseline. */
		sphere: ink.axisLine,
	},
	/**
	 * A mark group's response to emphasis — the legend's focused group, or the
	 * pointed mark on the map itself. Everything outside it dims, and the
	 * emphasised mark holds. On a wrapper (an overlay's, or the whole region
	 * layer's recede group), so motion's inline opacity composes. A county atlas
	 * also fades as one transition, never one per path. Thousands of simultaneous
	 * opacity transitions priced a legend focus at hundreds of milliseconds of
	 * per-frame compositing.
	 */
	group: (dimmed: boolean) => ['transition-opacity', dimmed ? 'opacity-25' : ''],
	/** Keyboard focus ring — the shared accent outline, on the navigable plot region. */
	focus: sen.focus.ring,
	/**
	 * The legend's reserved box, mounted before any button registers so the
	 * frame never shifts as entries land:
	 *
	 * - The `row` placements (top / bottom, and every placement stacked below
	 *   `lg`) hold one item-row of height.
	 * - The side `panel` holds a fixed column width from `lg`. A label too wide
	 *   for it clips, revealing itself on hover.
	 *
	 * The plot's width therefore never depends on what has registered.
	 */
	legendBox: {
		row: 'min-h-4',
		panel: ['min-h-4', 'shrink-0', 'lg:w-48'],
	},
	/** Motion vocabulary for the mount reveals, from `zu`, so the two modules' reveals never drift. */
	motion,
	skeleton: kokkaku.map,
} as const
