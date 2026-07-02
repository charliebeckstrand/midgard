import { cn } from '../../core'
import { k } from '../../recipes/kata/chart'

/** One legend entry: the series name keyed by its mark-mirroring swatch. @internal */
export type ChartLegendItem = {
	label: string
	/** Background class carrying the series colour. */
	swatchClass: string
	/** Swatch shape, mirroring the mark: `rect` for bars and slices, `line` for lines. */
	swatch: 'rect' | 'line'
}

/** Props for {@link ChartLegend}. @internal */
export type ChartLegendProps = {
	items: ChartLegendItem[]
}

/**
 * The legend row above the plot — the dependable identity channel for two or
 * more series. Plain HTML, outside the `role="img"` region, so assistive
 * tech reads the entries; swatches carry the colour, the text stays in ink.
 *
 * @internal
 */
export function ChartLegend({ items }: ChartLegendProps) {
	return (
		<div data-slot="chart-legend" className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
			{items.map((item) => (
				<span key={item.label} data-slot="chart-legend-item" className="flex items-center gap-1.5">
					<span
						aria-hidden="true"
						className={cn(
							item.swatch === 'rect' ? 'size-2.5 rounded-xs' : 'h-0.5 w-3 rounded-full',
							item.swatchClass,
						)}
					/>

					<span className={cn(k.label)}>{item.label}</span>
				</span>
			))}
		</div>
	)
}
