/**
 * Map kata: the sheet of the geography map module. Many files read it with no
 * call, so it stays a plain object. The series palette, frame inks, readout
 * inks, and reveal motion come from the kiso `zu` bundle, which the chart kata
 * reads too. The two data-viz modules read as one color system, and the
 * CVD-validated slot order must never fork. The map's own region tokens sit
 * beside them:
 *
 * - The no-data fill.
 * - The surface-color boundary seam.
 * - The frame chrome.
 * - The hover and de-emphasis treatments.
 */
import { mode } from '../../core/recipe'
import { dan, hannou, kokkaku, omote, type SeriesSlot, sen, zu } from '../kiso'

const { palette, ink, motion } = zu

/** A named map mark color: the eight categorical data-viz slots plus `zinc`. */
export type MapSeriesColor = SeriesSlot

/** The map's one pointer affordance, shared by the region layer and the overlay marks. */
const CLICKABLE = 'cursor-pointer'

/**
 * The map's one selection ink, the `zu` selection ink that the heatmap cell
 * ring takes too. It holds its contrast over the geography an overlay draws
 * across as well.
 */
const SELECTED = ink.selected

export const k = {
	/** The gap of the map frame, and of the map and its legend panel. */
	frame: dan.gap.scale.lg,
	/**
	 * The pointer affordance on a mark that answers a click: an overlay's hit
	 * shape. It carries it per shape, because a mark draws at most three. The
	 * region layer instead rides one group over thousands of paths
	 * (`region.clickable`, the same token).
	 */
	clickable: CLICKABLE,
	/**
	 * The hit circle of a dot on a fine pointer. The `fine` class narrows it, and
	 * the `radius` custom property gives that class its radius.
	 */
	hit: {
		/**
		 * Takes a mark's hit circle from the coarse reach its `r` attribute carries,
		 * down to the fine-pointer one. That coarse reach is 44px for a finger, WCAG
		 * 2.5.5's enhanced target. It is the one form an SVG shape allows, because only
		 * CSS can read the input modality. `dotHitProps` sets the radius itself on
		 * {@link k.hit.radius}, and carries this class on the dots that have ground to
		 * give back. A dot standing clear of every zone and every neighbor keeps the
		 * coarse target on both pointers.
		 *
		 * It narrows only where the device has no coarse pointer at all. `pointer-fine`
		 * reads the primary pointer alone. A laptop with a touchscreen therefore matched
		 * it, and a finger double tap hit-tested the narrowed circle
		 * (`use-map-touch-tap`). A mouse on such a device keeps the coarse target.
		 *
		 * It is what lets a small area mark be pointed at. A `MapGeofence` drawn tight
		 * around a `MapPoint` sits wholly inside a finger-sized circle. Without this
		 * the dot claims the zone's whole face, and the two can never be told apart. The
		 * mouse target can sit under WCAG 2.5.8's 24px minimum deliberately, and
		 * `POINT_HIT_RADIUS_FINE` states why.
		 *
		 * The fallback is spelled out rather than read from that constant, because
		 * Tailwind scans source for whole class strings; `map-hit-target.test.tsx` pins
		 * the two together. It is the floor a budget can never take a target under:
		 * the radius a dot of the default size draws at.
		 */
		fine: 'pointer-fine:not-any-pointer-coarse:[r:var(--map-hit-radius,5.5px)]',
		/**
		 * The custom property {@link k.hit.fine} reads its radius from: what the ground
		 * under the dot can spare it. That is divided by the plat's zoom scale, so the
		 * target holds one device-pixel size at every scale. Named here beside the
		 * class that reads it, so the setter and the reader hold one spelling.
		 */
		radius: '--map-hit-radius',
	},
	/**
	 * The standing pick's ink, on an overlay mark's halo. It is the same token the
	 * region ring takes (`region.selected`). One map therefore never marks its
	 * geography and its overlays in two different colors.
	 */
	selected: SELECTED,
	/** Shared data-viz palette from `zu`: the same slots, order, and validation as `kata/chart`. */
	series: palette.series,
	/**
	 * The soft tone of each slot, for a category with `tone: 'soft'`: a lighter
	 * step of the same hue for a region and its swatch: the 300 step in light
	 * and dark mode, so it reads lighter than the solid step on each surface.
	 * `zinc` takes 400 and 600, because its 300 and 800 steps are too near the
	 * no-data fill ({@link k.region.empty}).
	 */
	soft: {
		blue: {
			fill: mode('fill-blue-300', 'dark:fill-blue-300'),
			text: mode('text-blue-300', 'dark:text-blue-300'),
		},
		orange: {
			fill: mode('fill-orange-300', 'dark:fill-orange-300'),
			text: mode('text-orange-300', 'dark:text-orange-300'),
		},
		violet: {
			fill: mode('fill-violet-300', 'dark:fill-violet-300'),
			text: mode('text-violet-300', 'dark:text-violet-300'),
		},
		green: {
			fill: mode('fill-green-300', 'dark:fill-green-300'),
			text: mode('text-green-300', 'dark:text-green-300'),
		},
		red: {
			fill: mode('fill-red-300', 'dark:fill-red-300'),
			text: mode('text-red-300', 'dark:text-red-300'),
		},
		sky: {
			fill: mode('fill-sky-300', 'dark:fill-sky-300'),
			text: mode('text-sky-300', 'dark:text-sky-300'),
		},
		amber: {
			fill: mode('fill-amber-300', 'dark:fill-amber-300'),
			text: mode('text-amber-300', 'dark:text-amber-300'),
		},
		rose: {
			fill: mode('fill-rose-300', 'dark:fill-rose-300'),
			text: mode('text-rose-300', 'dark:text-rose-300'),
		},
		zinc: {
			fill: mode('fill-zinc-400', 'dark:fill-zinc-600'),
			text: mode('text-zinc-400', 'dark:text-zinc-600'),
		},
	} satisfies Record<MapSeriesColor, { fill: string[]; text: string[] }>,
	/**
	 * The stripes of a category with `stripes`. On a region, a pattern in the
	 * region layer draws them. On a swatch, this layer draws them over the
	 * fill of the first color. The layer takes the `currentColor` class of the
	 * second color, and the gradient paints that color in bands that match the
	 * region. Under forced colors the gradient goes, and the swatch keeps its
	 * one system color.
	 */
	stripes:
		'pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,currentColor_0,currentColor_2px,transparent_2px,transparent_4px)] forced-colors:hidden',
	/**
	 * A shared summary: a summary that holds the dots of more than one set. A ring
	 * of the colors of its sets carries the mark. Thus the disc inside the ring
	 * and the count on it take the inks of the surface. No one set color then names a
	 * mark that belongs to several sets.
	 */
	shared: {
		/** The disc inside the ring: the surface color, the region seam's ink. */
		disc: mode('stroke-white', 'dark:stroke-zinc-900'),
		/** The count on the disc: the text ink of the surface. */
		count: mode('fill-zinc-900', 'dark:fill-white'),
	},
	/** The map's own region tokens beside the shared data-viz palette. */
	region: {
		/** A region with no matching datum, and a toggled-off category's fallback. */
		empty: mode('fill-zinc-200', 'dark:fill-zinc-300'),
		/** Region boundary seam: the surface color, so shared borders read as gaps. */
		border: mode('stroke-white', 'dark:stroke-zinc-900'),
		/**
		 * Pointer emphasis on the hovered region. Light mode darkens and dark mode
		 * brightens, so the hovered region always moves away from the surface. A
		 * brightened light fill fades toward the white seam and the page.
		 */
		hover: mode('hover:brightness-90', 'dark:hover:brightness-110'),
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
		 * class of their own. That is the same reason the cursor rides the group. It is
		 * `hannou.busy`: the pulse, with a standing dim in its place for the reader who
		 * asked for less motion. `kata/grid`'s `body.settling` and
		 * `kata/chat-message`'s `streaming` carry the same pair. A loading state that renders as
		 * nothing at all for that reader is the gray map this token exists to disambiguate.
		 *
		 * Distinct from {@link MapSkeleton}, which stands in for a plat with no ATLAS.
		 * There the frame is reserved and nothing is drawn. Here the geography is drawn,
		 * and only the paint is pending. Without this the two are indistinguishable on
		 * screen. A fully gray map reads as "nobody covers anywhere", which is a
		 * statement about coverage rather than about a request in flight.
		 */
		loading: hannou.busy,
		/**
		 * The pointed region's lit copy carries the hover emphasis statically:
		 * it is the hovered region by definition, and `:hover` can't reach the
		 * pointer-events-none copy.
		 */
		pointed: mode('brightness-90', 'dark:brightness-110'),
		/**
		 * The selected region's outline: the map's shared {@link k.selected} ink,
		 * kept here so the region layer reads its selection beside its other paint.
		 */
		selected: SELECTED,
		/**
		 * The outline on each region that a legend emphasis holds lit. The dim
		 * fades the other regions toward the surface, which is one end of a
		 * sequential ramp. A lit region at that end therefore has the color of the
		 * dimmed ones, and only the outline tells it apart.
		 */
		emphasized: {
			/**
			 * On a numeric bin's fill, the outline takes the pole that contrasts
			 * with that fill, in both modes. That is `dark` on a light fill, and
			 * `light` on a dark fill. The fill, not the surface, is what the outline must part
			 * from.
			 */
			dark: 'stroke-zinc-900',
			light: 'stroke-white',
			/**
			 * On a categorical slot's class fill, the {@link k.region.selected}
			 * ink. A slot is a mid tone in both modes, so the surface ink parts
			 * from it.
			 */
			slot: SELECTED,
		},
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
		sphere: ink.axis.line,
	},
	/**
	 * A mark group's response to emphasis: the legend's focused group, or the
	 * pointed mark on the map itself. Everything outside it dims, and the
	 * emphasized mark holds. On a wrapper (an overlay's, or the whole region
	 * layer's recede group), so motion's inline opacity composes. A county atlas
	 * also fades as one transition, never one per path. Thousands of simultaneous
	 * opacity transitions made a legend focus miss frames.
	 */
	group: (dimmed: boolean) => ['transition-opacity', dimmed ? 'opacity-25' : ''],
	/** Keyboard focus ring: the shared accent outline, on the navigable plot region. */
	focus: sen.focus.ring,
	/**
	 * The legend's reserved box, mounted before any button registers so the
	 * frame never shifts as entries land:
	 *
	 * - The `row` placements (top / bottom, and every placement stacked below
	 *   the map's own `@lg` width) hold one item-row of height.
	 * - The side `panel` holds a fixed column width from the map's `@lg` width. A label too wide
	 *   for it clips, revealing itself on hover.
	 *
	 * The plot's width therefore never depends on what has registered.
	 *
	 * The item-row is 32 px, the height of a `sm` button. An entry is a
	 * `LegendSwitch`, and its explicit `size="sm"` makes it its own density
	 * scope. Thus the reserve is a plain height and not a density ramp, and it
	 * matches the entry at each density.
	 */
	legend: {
		/** The gap of the swatch and the label of a legend entry. */
		entry: dan.gap.scale.sm,
		row: 'min-h-8',
		panel: ['min-h-8', 'shrink-0', '@lg:w-48'],
	},
	/** Motion vocabulary for the mount reveals, from `zu`, so the two modules' reveals never drift. */
	motion,
	skeleton: {
		base: kokkaku.map.base,
		aspect: kokkaku.map.aspect,
		/** The outline skeleton: the placeholder's pulse and tone, as the fill of the projection's outline. */
		outline: {
			base: [...kokkaku.map.outline.base, ...omote.skeleton.shape],
			/** The outline skeleton in an aspect frame: full width, with the height from the ratio. */
			aspect: [...kokkaku.map.outline.aspect, ...omote.skeleton.shape],
		},
	},
} as const
