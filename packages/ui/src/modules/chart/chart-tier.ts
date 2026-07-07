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
	gridLines: boolean
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

/** Plot height one value tick is given, so a taller plot targets more ticks (density still caps it). @internal */
export const TICK_SPACING = 44

/** Fewest value ticks a live axis targets, so a short-but-drawn axis still reads two. @internal */
export const MIN_TICK_TARGET = 2

/**
 * Resolves the anatomy {@link ChartPolicy} for a plot box of `width` × `height`,
 * capping the height-driven tick target at the density ceiling `tickCap`. Pure
 * and space-only: it reads the box the frame measured and never the viewport,
 * and it never consults the caller's `axes` / `gridLines` intent — a chart
 * composes those at the layout boundary, so a policy is deterministic in its box
 * alone and testable without a render.
 *
 * @param width The plot box's width in px — pays for the value gutter, the
 * number format, and the band-label density.
 * @param height The plot box's height in px — pays for the tick count and the
 * band-axis row.
 * @param tickCap The density-resolved tick ceiling (`CHART_METRICS[size]`), so
 * space can take ticks away but never add past the density step.
 * @internal
 */
export function chartPolicy(width: number, height: number, tickCap: number): ChartPolicy {
	const spark = width < SPARK_WIDTH || height < SPARK_HEIGHT

	const tier: ChartTier = spark
		? 'spark'
		: width < COMPACT_WIDTH || height < COMPACT_HEIGHT
			? 'compact'
			: width < EXPANDED_WIDTH
				? 'standard'
				: 'expanded'

	return {
		tier,
		valueAxis: spark ? 'off' : 'gutter',
		// A short-but-wide banner drops the band row yet keeps its gutter; the two
		// bind to different dimensions, so neither breakpoint could speak for both.
		bandAxis:
			spark || height < BAND_ROW_HEIGHT ? 'off' : width < COMPACT_WIDTH ? 'ends' : 'thinned',
		tickTarget: spark
			? 0
			: Math.max(MIN_TICK_TARGET, Math.min(Math.floor(height / TICK_SPACING), tickCap)),
		compactFormat: width < COMPACT_WIDTH,
		axisTitles: !spark && width >= AXIS_TITLE_WIDTH && height >= AXIS_TITLE_HEIGHT,
		gridLines: !spark,
	}
}
