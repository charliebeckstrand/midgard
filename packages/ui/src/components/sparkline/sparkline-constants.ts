import type { Step } from '../../recipes'

/**
 * Fixed drawing metrics for a {@link Sparkline} at each density step, in the
 * SVG's user units. The `width` / `height` set the default coordinate box (and
 * the intrinsic size when no explicit `width` / `height` is passed); the rest
 * tune the marks: the inter-bar `barGap`, the bar corner `barRadius`, and the
 * end-point marker `pointRadius`.
 *
 * @internal
 */
export type SparklineMetrics = {
	width: number
	height: number
	barGap: number
	barRadius: number
	pointRadius: number
}

/**
 * Per-step metrics, keyed by the resolved density {@link Step}. A sub-step
 * (`xs` / `xl`) density falls back to `md` at the call site.
 * @internal
 */
export const SPARKLINE_METRICS: Record<Step, SparklineMetrics> = {
	sm: { width: 64, height: 24, barGap: 1, barRadius: 0.5, pointRadius: 1.5 },
	md: { width: 96, height: 32, barGap: 1.5, barRadius: 1, pointRadius: 2 },
	lg: { width: 128, height: 40, barGap: 2, barRadius: 1, pointRadius: 2.5 },
}
