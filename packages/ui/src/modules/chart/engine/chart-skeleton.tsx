import { Placeholder } from '../../../components/placeholder'
import { cn } from '../../../core'
import type { DensityStep } from '../../../core/density'
import { k } from '../../../recipes/kata/chart'
import { parseAspectRatio } from '../../../utilities'
import type { ChartAspectRatio } from './chart-frame/sizing'

/** Props for {@link ChartSkeleton}: the ratio or the sector form of the chart, and `className`. */
export type ChartSkeletonProps = {
	/**
	 * The `aspectRatio` of the chart it stands in for. The default is the
	 * default of the cartesian charts. Pass the ratio of a heatmap, of a
	 * choropleth, or of a pie that sets one. `false` gives a block with the
	 * height of the `size` step.
	 * @defaultValue '16/9'
	 */
	aspectRatio?: ChartAspectRatio
	/**
	 * Stands in for a pie or a donut with no `aspectRatio`: a square plot and
	 * the legend row below it. `aspectRatio` has no effect on this form.
	 * @defaultValue false
	 */
	sector?: boolean
	/**
	 * The density step of the block when `aspectRatio` is `false`. With a
	 * ratio, the width sets the height, as it does for the chart.
	 */
	size?: DensityStep
	className?: string
}

/**
 * Loading placeholder that reserves the box of a chart. A chart takes its
 * height from its width, so the skeleton reserves the ratio of the chart. The
 * default is the 16/9 of the cartesian charts (bar, line, area, combo,
 * scatter, and bubble). `sector` gives the square plot and the legend row of a
 * pie or a donut.
 *
 * @remarks Static leaf: renders in React Server Components.
 */
export function ChartSkeleton({
	aspectRatio = '16/9',
	sector = false,
	size,
	className,
}: ChartSkeletonProps) {
	if (sector) {
		return (
			<div aria-hidden="true" className={cn(k.skeleton.sector, className)}>
				<Placeholder className={cn(k.skeleton.plot)} />
				<Placeholder data-density="sm" className={cn(k.skeleton.legend)} />
			</div>
		)
	}

	const ratio = parseAspectRatio(aspectRatio)

	if (ratio === null) {
		return <Placeholder data-density={size} className={cn(k.skeleton.base, className)} />
	}

	return <Placeholder className={cn(k.skeleton.aspect, className)} style={{ aspectRatio: ratio }} />
}
