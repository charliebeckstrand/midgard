/**
 * Pure tier resolution for the chart frame: the per-element anatomy budget a
 * chart draws at a given plot-box size. Kept React-free beside `chart-layout.ts`
 * so the breakpoint math is unit-testable in isolation, the same posture as the
 * scale, frame-layout, and geometry cores.
 *
 * A chart resolves its anatomy from the box it is handed, never the viewport:
 * each element binds to the dimension that pays for it — the value gutter and
 * the number format to width, the tick count and the band row to height — and
 * yields in a fixed order as the box shrinks, so one chart stays legible from a
 * wide tile down to a sparkline rather than rendering a squeezed copy of itself.
 * The marks, the tooltip, the keyboard layer, and the visually-hidden data table
 * are never on the ladder; only the chrome around them is.
 */

/**
 * A chart's resolved anatomy tier, narrowest to widest. `spark` is pure marks —
 * a sparkline with the chrome stripped; `compact` keeps a value gutter (compact
 * number format) and end-only band labels; `standard` and `expanded` carry the
 * full frame, differing only as a styling label a dashboard tile can read off
 * `data-tier` (the cartesian anatomy is identical between them).
 */
export type ChartTier = 'spark' | 'compact' | 'standard' | 'expanded'

/** How the value axis presents: a gutter of tick labels beside the plot, or nothing. @internal */
export type ChartValueAxisMode = 'gutter' | 'off'

/**
 * How the band axis presents: every fitting label {@link ChartBandAxisMode
 * thinned} to every nth, only the first and last as `ends`, or nothing.
 * @internal
 */
export type ChartBandAxisMode = 'thinned' | 'ends' | 'off'

/**
 * The per-element anatomy a chart draws at its resolved {@link ChartTier}. Each
 * field answers one drawing decision the frame and layout read; a chart composes
 * them with the caller's own intent (an explicit `axes={false}` still wins over
 * a live gutter), so the policy stays a pure function of the box.
 *
 * @internal
 */
export type ChartPolicy = {
	/** The resolved tier — the readable summary, and the `data-tier` styling hook. */
	tier: ChartTier
	/** Whether the value axis reserves a gutter of tick labels or stands down entirely. */
	valueAxis: ChartValueAxisMode
	/** Whether the band axis thins its labels, shows only its ends, or stands down. */
	bandAxis: ChartBandAxisMode
	/**
	 * How many value ticks to aim for — driven by height (about one per {@link
	 * TICK_SPACING} px), capped by density so space can only take ticks away, never
	 * add past what the density step allows; `0` at spark, where the axis is off.
	 */
	tickTarget: number
	/**
	 * Format the value-axis tick labels compactly (`48.2k`, `1.3M`) so the gutter
	 * stays cheap in a narrow box. The readout — tooltip and hidden table — keeps
	 * full precision regardless; only the tick labels compact.
	 */
	compactFormat: boolean
	/** Whether the value-axis titles have room to draw. */
	axisTitles: boolean
	/** Whether the hairline gridlines draw. */
	grid: boolean
	/**
	 * How many rows a stacked (top / bottom) legend band may take before the rest
	 * collapse into a `+N` overflow chip: two where the frame is tall and wide,
	 * one in a narrow or short frame, none at spark (the legend is gone with the
	 * chrome). The cap bounds what the band takes from the aspect box, so the plot
	 * can never be crushed below its floor. A side rail paginates instead and
	 * ignores this.
	 */
	legendRows: 0 | 1 | 2
}

/** Width below which a chart is a bare sparkline — the marks alone. @internal */
export const SPARK_WIDTH = 160

/** Height below which a chart is a bare sparkline — the marks alone. @internal */
export const SPARK_HEIGHT = 96

/** Width below which the frame runs compact — a gutter, but end-only band labels. @internal */
export const COMPACT_WIDTH = 384

/** Height below which the frame runs compact — one tick row target, one legend row. @internal */
export const COMPACT_HEIGHT = 176

/** Width at or above which the frame reads `expanded` — a styling label, not an anatomy change. @internal */
export const EXPANDED_WIDTH = 672

/** Height below which the band-axis row is dropped, returning its band to the plot. @internal */
export const BAND_ROW_HEIGHT = 128

/** Width the value-axis titles need before they draw. @internal */
export const AXIS_TITLE_WIDTH = 512

/** Height the value-axis titles need before they draw. @internal */
export const AXIS_TITLE_HEIGHT = 224

/** Height a stacked legend needs before it may take a second row rather than one. @internal */
export const TWO_ROW_LEGEND_HEIGHT = 224

/** Plot height one value tick is given, so a taller plot targets more ticks (density still caps it). @internal */
export const TICK_SPACING = 44

/** Fewest value ticks a live axis targets, so a short-but-drawn axis still reads two. @internal */
export const MIN_TICK_TARGET = 2

/**
 * Height, in px, of one clipped header line — a title or a subtitle. The header
 * never wraps (each line truncates to one line), so its height is a fixed
 * multiple of this, a two-line header adding {@link CHART_HEADER_LINE_GAP}
 * between the pair. Read off the rendered header, so the {@link
 * chartChromeReserve} budget matches the box the figure actually lays out.
 * @internal
 */
export const CHART_HEADER_LINE_HEIGHT = 24

/** Gap, in px, between the title and subtitle lines of a two-line header. @internal */
export const CHART_HEADER_LINE_GAP = 2

/** Height, in px, of one stacked legend row. @internal */
export const CHART_LEGEND_ROW_HEIGHT = 30

/**
 * Gap, in px, between the figure's stacked flex children — the header, the plot,
 * and a stacked legend band — one sitting between each adjacent pair.
 * @internal
 */
export const CHART_FIGURE_GAP = 12

/** The tier a non-spark box reads, widest to narrowest. @internal */
function tierOf(width: number, height: number): Exclude<ChartTier, 'spark'> {
	if (width < COMPACT_WIDTH || height < COMPACT_HEIGHT) return 'compact'

	return width < EXPANDED_WIDTH ? 'standard' : 'expanded'
}

/**
 * How the band axis presents in a non-spark box: dropped in a short frame (its
 * row costs height), only the ends in a compact-width one, else thinned. @internal
 */
function bandAxisOf(width: number, height: number): ChartBandAxisMode {
	if (height < BAND_ROW_HEIGHT) return 'off'

	return width < COMPACT_WIDTH ? 'ends' : 'thinned'
}

/**
 * Whether a plot box is small enough to strip to a bare sparkline — under the
 * spark width or the spark height. The spark threshold on its own, so a module
 * that sizes its own frame before the policy resolves (the pie, weighing whether
 * a callout band would starve the plot to this floor) reads the same line the
 * tier does rather than duplicating it.
 *
 * @internal
 */
export function isSparkBox(width: number, height: number): boolean {
	return width < SPARK_WIDTH || height < SPARK_HEIGHT
}

/**
 * Resolves the anatomy {@link ChartPolicy} for a plot box of `width` × `height`,
 * capping the height-driven tick target at the density ceiling `tickCap`. Pure
 * and space-only: it reads the box the frame measured and never the viewport,
 * and it never consults the caller's `axes` / `grid` intent — a chart
 * composes those at the layout boundary, so a policy is deterministic in its box
 * alone and testable without a render.
 *
 * @param width The plot box's width in px — pays for the value gutter, the
 * number format, and the band-label density.
 * @param height The plot box's height in px — pays for the tick count and the
 * band-axis row.
 * @param tickCap The density-resolved tick ceiling (`CHART_METRICS[size]`), so
 * space can take ticks away but never add past the density step.
 * @param fill The frame fills its container (`aspectRatio={false}`), so the
 * measured `height` is the remainder the chart's own chrome leaves — a value
 * every chrome decision perturbs. Spark dropping the header and legend (or the
 * legend taking another row) moves the very remainder that decided it, a
 * feedback loop with no fixed point that a resize drives to React's update
 * depth; and no container measurement escapes it, since an indefinite-height
 * parent collapses any ancestor box to that same content. So under `fill` the
 * chrome-affecting decisions — spark and the legend-row cap — resolve from the
 * width alone, which no chrome can move, while the plot-internal anatomy (tick
 * target, band row, titles, the tier label) still reads the measured height it
 * cannot feed back into. A very short fill box draws a cramped-but-stable frame
 * rather than a sparkline; a caller wanting spark-by-height passes a `height`
 * or ratio instead.
 * @internal
 */
export function chartPolicy(
	width: number,
	height: number,
	tickCap: number,
	fill = false,
): ChartPolicy {
	const spark = fill ? width < SPARK_WIDTH : isSparkBox(width, height)

	if (spark) {
		return {
			tier: 'spark',
			valueAxis: 'off',
			bandAxis: 'off',
			tickTarget: 0,
			compactFormat: true,
			axisTitles: false,
			grid: false,
			legendRows: 0,
		}
	}

	return {
		tier: tierOf(width, height),
		valueAxis: 'gutter',
		bandAxis: bandAxisOf(width, height),
		tickTarget: Math.max(MIN_TICK_TARGET, Math.min(Math.floor(height / TICK_SPACING), tickCap)),
		compactFormat: width < COMPACT_WIDTH,
		axisTitles: width >= AXIS_TITLE_WIDTH && height >= AXIS_TITLE_HEIGHT,
		grid: true,
		// A stacked band takes two rows only where it has both the width to pack them
		// and the height to spend on them; a narrow or short frame holds one row and
		// chips the rest. A fill frame grants by width alone — its measured height
		// already contains the rows it would be granting, so a height check flips
		// forever in the band a second row spans.
		legendRows: width < COMPACT_WIDTH || (!fill && height < TWO_ROW_LEGEND_HEIGHT) ? 1 : 2,
	}
}

/**
 * The aspect-box chrome a chart draws around its plot, for the {@link
 * chartChromeReserve} budget: the header lines above the plot and whether a
 * stacked legend bands below it. Read from the chart's props — never the tier —
 * so the budget stays a pure function of the props and can't feed the tier it
 * helps resolve back into itself.
 *
 * @internal
 */
export type ChartChrome = {
	/** Header lines above the plot: `0` (none), `1` (a title or subtitle alone), or `2` (both). */
	headerLines: 0 | 1 | 2
	/** A stacked (top / bottom) legend bands inside the aspect box below the plot. */
	legend: boolean
}

/** The header lines a `title` and `subtitle` draw above the plot: 0, 1, or 2. @internal */
export function headerLineCount(title?: string, subtitle?: string): 0 | 1 | 2 {
	return ((title ? 1 : 0) + (subtitle ? 1 : 0)) as 0 | 1 | 2
}

/**
 * The height an aspect-fill figure's chrome takes from the box its ratio sets:
 * the header, a stacked legend, and the {@link CHART_FIGURE_GAP} gaps flanking
 * the plot. Subtracted from the figure's `width / ratio`, it recovers the plot's
 * own height without measuring a plot the tier's spark decision would resize. A
 * single legend row is budgeted: a second row only appears past the compact
 * width, where the extra height can't flip the tier. Computed, never measured —
 * the same posture as the tick-gutter estimate — so nothing the tier decides
 * feeds back into it.
 *
 * @internal
 */
export function chartChromeReserve({ headerLines, legend }: ChartChrome): number {
	const header =
		headerLines > 0
			? headerLines * CHART_HEADER_LINE_HEIGHT + (headerLines - 1) * CHART_HEADER_LINE_GAP
			: 0

	const legendBand = legend ? CHART_LEGEND_ROW_HEIGHT : 0

	// The plot always sits in the figure; the header and legend each add a flex
	// child, so one gap joins each to the plot.
	const gaps = ((headerLines > 0 ? 1 : 0) + (legend ? 1 : 0)) * CHART_FIGURE_GAP

	return header + legendBand + gaps
}

/**
 * The plot height the {@link chartPolicy} tier resolves against. A stacked
 * aspect-fill figure shares its ratio box with the header and legend, so the
 * plot's *measured* remainder shrinks while the tier keeps that chrome and jumps
 * when spark drops it — feeding that remainder back into the tier oscillates with
 * no fixed point. Under that mode the height is derived from the figure's own
 * `width / ratio` less the {@link chartChromeReserve chrome reserve}, a value no
 * tier decision perturbs, while the drawing still fills the measured remainder.
 * Every other frame mode's measured height passes through untouched: a fixed or
 * side-legend frame's is already tier-independent, and a free-form `fill`
 * frame's — the same shared-box remainder, with no ratio to derive a safe height
 * from — is defused inside {@link chartPolicy} instead, whose `fill` flag
 * resolves the chrome-affecting decisions from the width alone.
 *
 * @param measuredHeight The plot's measured drawing height, still the drawing's.
 * @param width The measured plot (and figure) width.
 * @param figureAspect The `width / height` the figure carries — set only for the
 * stacked aspect-fill frame, `null` / `undefined` otherwise, which passes the
 * measured height straight through.
 * @param chrome The header and stacked legend the figure lays out around the plot.
 * @internal
 */
export function policyPlotHeight(
	measuredHeight: number,
	width: number,
	figureAspect: number | null | undefined,
	chrome: ChartChrome,
): number {
	if (!figureAspect || width <= 0) return measuredHeight

	return Math.max(0, width / figureAspect - chartChromeReserve(chrome))
}
