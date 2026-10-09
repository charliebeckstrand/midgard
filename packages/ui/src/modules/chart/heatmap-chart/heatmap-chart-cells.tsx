'use client'

import { cn } from '../../../core'
import type { HeatmapCell } from '../engine/chart-geometry/heatmap'
import { seriesGroupClass } from '../engine/chart-series'
import { useHeatmapFocus } from './context'

/** The neutral fill for a cell with no datum, one step off the surface. @internal */
export const NO_DATA_FILL = 'fill-zinc-100 dark:fill-zinc-800'

/**
 * The no-data neutral on `currentColor`, for the HTML swatch that keys a
 * readout to the cell. It is one step past {@link NO_DATA_FILL}, because the
 * popover surface is `zinc-800` in dark mode and would hide the cell step.
 *
 * @internal
 */
export const NO_DATA_TEXT = 'text-zinc-200 dark:text-zinc-700'

/** Props for {@link HeatmapChartCells}: the resolved cells, their fills, and their bins. @internal */
type HeatmapChartCellsProps = {
	cells: HeatmapCell[]
	/** The fill per cell, index-aligned; `null` paints the no-data neutral. */
	fills: (string | null)[]
	/** The bin per cell, index-aligned; `null` for a no-data cell. Dims against the legend probe. */
	cellBins: (number | null)[]
}

/**
 * The cell grid: one rect per matrix cell, painted from the sequential scale or
 * the neutral no-data fill. Cells outside the legend's probed bin dim, the
 * heatmap's counterpart to the choropleth's region emphasis.
 *
 * @internal
 */
export function HeatmapChartCells({ cells, fills, cellBins }: HeatmapChartCellsProps) {
	const { bin: focus } = useHeatmapFocus()

	return (
		<g data-slot="heatmap-cells">
			{cells.map((cell, index) => {
				const fill = fills[index]

				const dimmed = focus !== null && cellBins[index] !== focus

				return (
					<rect
						key={cell.key}
						x={cell.x}
						y={cell.y}
						width={cell.width}
						height={cell.height}
						rx={cell.radius}
						className={cn(seriesGroupClass(dimmed), fill == null && NO_DATA_FILL)}
						{...(fill == null ? {} : { fill })}
					/>
				)
			})}
		</g>
	)
}
