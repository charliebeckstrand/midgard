import { ChartLegend } from './chart-legend'
import type { ChartLegendPlacement } from './chart-schema'
import type { CartesianChart } from './use-chart-cartesian'

/** Props for {@link ChartCartesianLegend}. @internal */
type ChartCartesianLegendProps = {
	/**
	 * The resolved cartesian model — the series switches and reference chips, the
	 * hidden sets and their toggles, the emphasis setter, and the tier's
	 * legend-row budget.
	 */
	chart: CartesianChart
	/**
	 * The caller's `legend` prop: a side placement lays the rail out as a panel, a
	 * stacked one (or the boolean default) as the capped wrap row.
	 */
	legend: boolean | ChartLegendPlacement | undefined
	/** The `texture` prop is on, so the swatches hatch in every mode to mirror the marks. */
	texture: boolean
}

/**
 * The legend every cartesian chart mounts from its {@link useChartCartesian}
 * result — the one place {@link BarChart}, {@link LineChart}, {@link AreaChart},
 * and {@link ComboChart} share their legend wiring, so a new switch or a changed
 * prop lands in all four at once rather than four identical blocks drifting
 * apart. Renders nothing for a lone series (no legend resolved), so a chart
 * hands it straight to the frame's `legend` slot.
 *
 * @internal
 */
export function ChartCartesianLegend({ chart, legend, texture }: ChartCartesianLegendProps) {
	if (!chart.legendItems) return null

	return (
		<ChartLegend
			items={chart.legendItems}
			references={chart.referenceItems}
			hidden={chart.hidden}
			referenceHidden={chart.referenceHidden}
			onToggle={chart.toggleSeries}
			onToggleReference={chart.toggleReference}
			onFocus={chart.setEmphasis}
			panel={legend === 'left' || legend === 'right'}
			maxRows={chart.legendRows}
			texture={texture}
		/>
	)
}
