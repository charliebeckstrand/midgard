/**
 * Map kata: object-literal surface for the geography map module. The series
 * palette, legend chrome, and readout inks come straight from `kata/chart` —
 * the two data-viz modules read as one colour system, and the CVD-validated
 * slot order must never fork — with the map's own region tokens beside them:
 * the no-data fill, the surface-colour boundary seam, the frame chrome, and the
 * hover and de-emphasis treatments.
 */
import { mode } from '../../core/recipe'
import { kokkaku, sen, ugoki } from '../kiso'
import { type ChartColorSlot, k as chart } from './chart'

/** A named map mark colour: the chart module's eight categorical slots plus `zinc`. */
export type MapSeriesColor = ChartColorSlot

/** The map's one pointer affordance, shared by the region layer and the overlay marks. */
const CLICKABLE = 'cursor-pointer'

/**
 * The map's one selection ink. Foreground ink, not a palette slot: a mark in one
 * of the eight categorical hues would read as a ninth category, and the neutral
 * holds its contrast over every slot, over the no-data fill, and over the
 * geography an overlay draws across alike.
 */
const SELECTED = mode('stroke-zinc-900', 'dark:stroke-white')

export const k = {
	/**
	 * The pointer affordance on a mark that answers a click: an overlay's hit
	 * shape, which carries it per shape because a mark draws at most three, where
	 * the region layer rides one group over thousands of paths (`region.clickable`,
	 * the same token).
	 */
	clickable: CLICKABLE,
	/**
	 * Takes a mark's hit circle from the coarse reach its `r` attribute carries —
	 * 44px for a finger, WCAG 2.5.5's enhanced target — down to the fine-pointer
	 * one, in the one form an SVG shape allows: only CSS can read the input
	 * modality. `dotHitProps` sets the radius itself on {@link k.hitRadius}, and
	 * carries this class on the dots that have ground to give back — a dot standing
	 * clear of every zone and every neighbour keeps the coarse target on both
	 * pointers.
	 *
	 * It is what lets a small area mark be pointed at: a `MapGeofence` drawn tight
	 * around a `MapPoint` sits wholly inside a finger-sized circle, so without this
	 * the dot claims the zone's whole face and the two can never be told apart. The
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
	 * under the dot can spare it, divided by the plat's zoom scale so the target
	 * holds one device-pixel size at every scale. Named here beside the class that
	 * reads it, so the setter and the reader hold one spelling.
	 */
	hitRadius: '--map-hit-radius',
	/**
	 * The standing pick's ink, on an overlay mark's halo — the same token the
	 * region ring takes (`region.selected`), so one map never marks its geography
	 * and its overlays in two different colours.
	 */
	selected: SELECTED,
	/** Shared data-viz palette: same slots, same order, same validation as `kata/chart`. */
	series: chart.series,
	order: chart.order,
	/** Legend / tooltip label ink (HTML text; marks carry the colour, text never does). */
	label: chart.label,
	/** Tooltip value ink: the strong element, values lead. */
	value: chart.value,
	/** The map's own region tokens beside the shared data-viz palette. */
	region: {
		/** A region with no matching datum — and a toggled-off category's fallback. */
		empty: mode('fill-zinc-200', 'dark:fill-zinc-800'),
		/** Region boundary seam: the surface colour, so shared borders read as gaps. */
		border: mode('stroke-white', 'dark:stroke-zinc-900'),
		/** Pointer emphasis on the hovered region. */
		hover: 'hover:brightness-110',
		/**
		 * The pointer affordance on a clickable map's region layer — every
		 * region is a target, so it rides the group and inherits down rather
		 * than repeating on thousands of paths. The same token as the shared
		 * {@link k.clickable} an overlay mark carries; kept here so the region
		 * layer reads its affordance beside its other paint.
		 */
		clickable: CLICKABLE,
		/**
		 * The region layer while its VALUES are still loading — the shapes are drawn and
		 * their numbers are not in yet, so every one of them holds the no-data fill.
		 *
		 * On the group, so it inherits to every path and thousands of regions carry no
		 * class of their own — the same reason the cursor rides the group. Gated to
		 * `motion-safe`, with a standing dim in its place for the reader who asked for
		 * less motion and never both, since the pulse already troughs to that opacity —
		 * the pair `kata/grid`'s `body.settling` and `kata/chat-message`'s `streaming`
		 * carry, because a loading state that renders as nothing at all for that reader
		 * is the grey map this token exists to disambiguate.
		 *
		 * Distinct from {@link MapSkeleton}, which stands in for a plat with no ATLAS: there
		 * the frame is reserved and nothing is drawn, here the geography is drawn and only
		 * the paint is pending. Without this the two are indistinguishable on screen — a
		 * fully grey map reads as "nobody covers anywhere", which is a statement about
		 * coverage rather than about a request in flight.
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
	 * The frame chrome, on the chart's own chrome inks: the graticule takes the
	 * gridline hairline and the sphere outline the axis baseline — a step firmer,
	 * the relation the two hold on every chart — so a dashboard's charts and maps
	 * rule their frames in one ink. Both are recessive under the marks, and both
	 * draw beneath the regions.
	 */
	chrome: {
		/** Meridian and parallel hairlines: the chart gridline. */
		graticule: chart.grid,
		/** The globe's own edge: the chart's axis baseline. */
		sphere: chart.axis.line,
	},
	/**
	 * A mark group's response to emphasis — the legend's focused group, or the
	 * pointed mark on the map itself: everything outside it dims, the
	 * emphasised mark holds. On a wrapper (an overlay's, or the whole region
	 * layer's recede group), so motion's inline opacity composes — and so a
	 * county atlas fades as one transition, never one per path: thousands of
	 * simultaneous opacity transitions priced a legend focus at hundreds of
	 * milliseconds of per-frame compositing.
	 */
	group: (dimmed: boolean) => ['transition-opacity', dimmed ? 'opacity-25' : ''],
	/** Keyboard focus ring — the shared accent outline, on the navigable plot region. */
	focus: sen.focus.ring,
	/**
	 * The legend's reserved box, mounted before any button registers so the
	 * frame never shifts as entries land: the `row` placements (top / bottom,
	 * and every placement stacked below `lg`) hold one item-row of height,
	 * and the side `panel` holds a fixed column width from `lg` — a label too
	 * wide for it clips, revealing itself on hover — so the plot's width never
	 * depends on what has registered.
	 */
	legendBox: {
		row: 'min-h-4',
		panel: ['min-h-4', 'shrink-0', 'lg:w-48'],
	},
	/** Motion vocabulary for the mount reveals: the chart kata's, verbatim, so the two modules' reveals never drift. */
	motion: chart.motion,
	skeleton: kokkaku.map,
} as const
