/**
 * Map kata: the sheet of the geography map module. Many files read it with no
 * call, so it stays a plain object. The series palette, frame inks, readout
 * inks, readout touch posture, and reveal motion come from the kiso `zu`
 * bundle, which the chart kata reads too. The two data-viz modules read as one color system, and the
 * CVD-validated slot order must never fork. The map's own region tokens sit
 * beside them:
 *
 * - The no-data fill.
 * - The surface-color boundary seam.
 * - The frame chrome.
 * - The hover and de-emphasis treatments.
 */
import { mode } from '../../core/recipe'
import { dan, hannou, kokkaku, narabi, omote, type SeriesSlot, sen, ugoki, zu } from '../kiso'

const { palette, ink, touch, motion } = zu

/** A named map mark color: the eight categorical data-viz slots plus `zinc`. */
export type MapSeriesColor = SeriesSlot

export const k = {
	/** The gap of the map frame, and of the map and its legend panel. */
	frame: dan.gap.scale.lg,
	/**
	 * The pointer affordance on a mark that answers a click. An overlay carries it
	 * on each hit shape, because a mark draws at most three. A clickable region
	 * layer carries it on its group, and it inherits down to every path, so
	 * thousands of regions do not each repeat it.
	 */
	clickable: 'cursor-pointer',
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
		 * it, and a finger tap hit-tested the narrowed circle
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
	 * The one selection ink of the map, the `zu` selection ink that the heatmap
	 * cell ring takes too. It is the halo of a picked overlay mark and the outline
	 * of a selected region, so one map never marks its geography and its overlays
	 * in two different colors. It holds its contrast over the geography an
	 * overlay draws across as well.
	 */
	selected: ink.selected,
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
	 * The tint of each slot, for a category with `tone: 'tint'`: the solid step
	 * of the slot at 35% alpha, so a region reads as tinted ground under the
	 * marks that stand on it. The alpha is on the fill, not on the path, so the
	 * seams between the regions keep their full ink. Each class is literal, so
	 * that Tailwind finds it.
	 */
	tint: {
		blue: {
			fill: mode('fill-blue-600/35', 'dark:fill-blue-500/35'),
			text: mode('text-blue-600/35', 'dark:text-blue-500/35'),
		},
		orange: {
			fill: mode('fill-orange-600/35', 'dark:fill-orange-600/35'),
			text: mode('text-orange-600/35', 'dark:text-orange-600/35'),
		},
		violet: {
			fill: mode('fill-violet-600/35', 'dark:fill-violet-500/35'),
			text: mode('text-violet-600/35', 'dark:text-violet-500/35'),
		},
		green: {
			fill: mode('fill-green-600/35', 'dark:fill-green-600/35'),
			text: mode('text-green-600/35', 'dark:text-green-600/35'),
		},
		red: {
			fill: mode('fill-red-600/35', 'dark:fill-red-500/35'),
			text: mode('text-red-600/35', 'dark:text-red-500/35'),
		},
		sky: {
			fill: mode('fill-sky-600/35', 'dark:fill-sky-600/35'),
			text: mode('text-sky-600/35', 'dark:text-sky-600/35'),
		},
		amber: {
			fill: mode('fill-amber-600/35', 'dark:fill-amber-600/35'),
			text: mode('text-amber-600/35', 'dark:text-amber-600/35'),
		},
		rose: {
			fill: mode('fill-rose-600/35', 'dark:fill-rose-500/35'),
			text: mode('text-rose-600/35', 'dark:text-rose-500/35'),
		},
		zinc: {
			fill: mode('fill-zinc-600/35', 'dark:fill-zinc-400/35'),
			text: mode('text-zinc-600/35', 'dark:text-zinc-400/35'),
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
		disc: ink.surface,
		/** The count on the disc: the text ink of the surface. */
		count: mode('fill-zinc-900', 'dark:fill-white'),
	},
	/** The map's own region tokens beside the shared data-viz palette. */
	region: {
		/** A region with no matching datum, and a toggled-off category's fallback. */
		empty: mode('fill-zinc-200', 'dark:fill-zinc-800'),
		/** Region boundary seam: the surface color, so shared borders read as gaps. */
		border: ink.surface,
		/**
		 * Pointer emphasis on the hovered region. Light mode darkens and dark mode
		 * brightens, so the hovered region always moves away from the surface. A
		 * brightened light fill fades toward the white seam and the page.
		 */
		hover: mode('hover:brightness-90', 'dark:hover:brightness-110'),
		/**
		 * The cursor of a region that takes no click on a clickable layer
		 * (`MapPlat`'s `isRegionDisabled`). It is on the path, so it overrides the
		 * pointer cursor ({@link k.clickable}) that the path inherits from the
		 * layer.
		 */
		disabled: 'cursor-default',
		/**
		 * The region layer while its VALUES are still loading. The shapes are drawn and
		 * their numbers are not in yet, so every one of them holds the no-data fill.
		 *
		 * On the group, so it inherits to every path and thousands of regions carry no
		 * class of their own. That is the same reason {@link k.clickable} rides the
		 * group. It is `hannou.busy`: the pulse, with a standing dim in its place for the reader who
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
		 * The outline on each region that a legend emphasis holds lit. The dim
		 * fades the other regions toward the surface, which is one end of a
		 * sequential ramp. A lit region at that end therefore has the color of the
		 * dimmed ones, and only the outline tells it apart. On a categorical
		 * slot's class fill, the outline takes the {@link k.selected} ink. A slot
		 * is a mid tone in both modes, so that ink parts from it.
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
	/**
	 * The touch posture of the plot: the root of a readout surface, from `zu`, so
	 * a hold on a map and on a chart selects no text and opens no callout.
	 */
	touch,
	/** Keyboard focus ring: the shared accent outline, on the navigable plot region. */
	focus: sen.focus.ring,
	/**
	 * The legend's reserved space, there before any button registers so the
	 * frame never shifts as entries land:
	 *
	 * - The `row` box holds one item-row of height. Each placement takes it: top
	 *   and bottom, and a side panel too, which is a row under the map below the
	 *   map's own `@lg` width.
	 * - The side `rail` is the grid of the plot and a side legend. From the map's
	 *   `@lg` width, it has a fixed 12rem column for the panel beside the plot.
	 *   A label too wide for it clips, and shows itself on hover.
	 *
	 * The plot's width therefore never depends on what has registered. The rail
	 * is a track of the grid, not the width of the panel, so the plot has its
	 * final box before the browser parses the panel. The panel follows a large
	 * SVG in the HTML, and a browser can paint the page before it gets there.
	 *
	 * The item-row is 32 px, the height of a `sm` button. An entry is a
	 * `LegendSwitch`, and its explicit `size="sm"` makes it its own density
	 * scope. Thus the reserve is a plain height and not a density ramp, and it
	 * matches the entry at each density.
	 */
	legend: {
		/** The gap of the swatch and the label of a legend entry. */
		entry: dan.gap.scale.sm,
		/**
		 * The row does not shrink. Its `min-h-8` replaces the minimum height of
		 * its content, and a `fill` plot shrinks when the frame is too short for
		 * the ratio of the plot. Without `shrink-0`, the row then took a part of
		 * the loss, and the legend went past the bottom of the frame.
		 */
		row: 'min-h-8 shrink-0',
		/**
		 * The band of the plot and a side legend. Below the map's `@lg`, it is a
		 * flex column, with the legend under the plot. From there it is a grid of
		 * two columns, and the `left` or `right` entry puts the rail on that side.
		 *
		 * The column below `@lg` is a flex column, not a grid of one column.
		 * WebKit sizes an `auto` grid row from a stale height when its item holds
		 * a flex box that wraps. When the map becomes narrower, the legend wraps
		 * to more rows, but the row keeps the height from the earlier width. The
		 * legend then goes past the bottom of the frame and covers the content
		 * under the map. A flex column takes the current height of the legend.
		 * From `@lg`, the width of the rail does not follow the width of the
		 * map, so the legend in the rail keeps its height.
		 *
		 * The `plot` line names the column of the plot, and `band` puts the plot
		 * there. The plot is the first child from the time the browser parses it,
		 * so it has its final column while it is the only child. The legend
		 * follows it in the DOM and takes the column that stays. Do not use
		 * `order` here: it does not move an only child off the first column.
		 *
		 * The `--map-rail` property is the width of the rail. The `panel` entry
		 * gives the fixed column of a switchboard. The `bar` entry gives a range
		 * bar the width of its labels, which the browser knows only after it
		 * parses the bar.
		 *
		 * The side is physical, and the columns of a right-to-left grid start at
		 * the right, so the `rtl:` variant of each side is the columns of the
		 * other side. Tailwind finds a class only as a complete literal, so each
		 * entry is written out in full.
		 */
		rail: {
			band: 'flex flex-col @lg:grid @lg:*:first:col-start-[plot] @lg:*:first:row-start-1',
			panel: '[--map-rail:12rem]',
			bar: '[--map-rail:auto]',
			left: '@lg:grid-cols-[var(--map-rail)_[plot]_minmax(0,1fr)] rtl:@lg:grid-cols-[[plot]_minmax(0,1fr)_var(--map-rail)]',
			right:
				'@lg:grid-cols-[[plot]_minmax(0,1fr)_var(--map-rail)] rtl:@lg:grid-cols-[var(--map-rail)_[plot]_minmax(0,1fr)]',
		},
	},
	/**
	 * The box around the plot and the zoom buttons of a zooming map. The buttons
	 * take a gutter on one side of the plot, so they never cover the geography.
	 * The plot takes the space that stays, and can become smaller than its
	 * content.
	 *
	 * The buttons follow the plot in the DOM, except at the top. The `left` and
	 * `right` entries are physical sides. The main axis of a flex row follows the
	 * reading direction, so the `rtl:` variant of each side reverses the row.
	 */
	zoomBox: {
		base: 'flex gap-2',
		top: 'flex-col',
		bottom: 'flex-col',
		left: 'flex-row-reverse rtl:flex-row',
		right: 'flex-row rtl:flex-row-reverse',
	},
	/**
	 * The zoom buttons of a zooming map, centered in the gutter beside, above,
	 * or below the plot. The group sits on the opaque surface fill with a ring,
	 * so it reads as one control. The buttons touch, so the group is a grid with
	 * the touch pitch: on a coarse pointer each cell is 44 px, and the hit area
	 * of a button does not reach over the next (CONVENTIONS §3.10).
	 */
	zoomControls: {
		base: [
			'grid shrink-0 self-center rounded-lg',
			narabi.touch.pitch,
			omote.bg.surface,
			sen.ring.default,
		],
		/** A stack beside the plot. */
		stack: '',
		/** A row above or below the plot. */
		row: 'grid-flow-col',
	},
	/**
	 * The overview inset of a zoomed map: a thumbnail of the whole geography in
	 * a bottom corner of the plot, with the current view lit. It takes the
	 * surface and the ring of the zoom buttons, so the two read as one set of
	 * controls. It shows only while the view is zoomed in, and it fades in from
	 * its first style (`starting:`), so it needs no Motion and stays still under
	 * reduced motion.
	 *
	 * The width is a quarter of the plot, between 5rem and 10rem. The height
	 * comes from the ratio of the frame, which the component sets.
	 *
	 * The inset takes no touch gesture of the browser (`touch-none`), so a
	 * finger that drags on it moves the view and does not scroll the page. The
	 * `left` and `right` entries are physical sides, as the zoom buttons are.
	 */
	overview: {
		base: [
			'absolute bottom-2 w-1/4 min-w-20 max-w-40 cursor-pointer touch-none overflow-hidden rounded-lg shadow-xs',
			'starting:opacity-0',
			ugoki.css.opacity,
			ugoki.css.duration,
			omote.bg.surface,
			sen.ring.default,
		],
		// biome-ignore lint/plugin/no-physical-side: the inset takes the physical side of the zoom buttons
		left: 'left-2',
		// biome-ignore lint/plugin/no-physical-side: the inset takes the physical side of the zoom buttons
		right: 'right-2',
		/** The silhouette of the geography: every region in one quiet fill. */
		land: mode('fill-zinc-400', 'dark:fill-zinc-500'),
		/** The scrim over the ground outside the view, so the view reads as lit. */
		scrim: mode('fill-white/50', 'dark:fill-zinc-900/50'),
		/** The edge of the view: the selection ink, which holds its contrast on each fill. */
		view: [...ink.selected, 'fill-none'],
	},
	/** Motion vocabulary for the mount reveals, from `zu`, so the two modules' reveals never drift. */
	motion,
	skeleton: {
		base: kokkaku.map.base,
		aspect: kokkaku.map.aspect,
		/** The outline skeleton: the placeholder's pulse and tone, as the fill of the projection's outline. */
		outline: {
			base: [...kokkaku.map.outline.base, omote.bg.skeleton.fill, ugoki.css.pulse],
			/** The outline skeleton in an aspect frame: full width, with the height from the ratio. */
			aspect: [...kokkaku.map.outline.aspect, omote.bg.skeleton.fill, ugoki.css.pulse],
		},
	},
} as const
