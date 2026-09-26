import type { CartesianChart } from '../use-chart-cartesian'
import { ChartLegend } from './legend'
import { type ChartLegendPlacement, legendAside } from './schema'

/** Props for {@link ChartCartesianLegend}. @internal */
type ChartCartesianLegendProps = {
	/**
	 * The resolved cartesian model — the series switches and reference chips, the
	 * hidden sets and their toggles, and the tier's legend-row budget. The legend
	 * does not use the frame ref.
	 */
	chart: Omit<CartesianChart, 'ref'>
	/**
	 * The caller's resolved `legend` placement. A side one lays the rail out as a
	 * panel, a stacked one (or the boolean default) as the capped wrap row.
	 */
	legend: boolean | ChartLegendPlacement | undefined
	/** Render the legend as a static key — no toggle, emphasis, or tab stop. */
	inert?: boolean
	/** The `texture` prop is on, so the swatches hatch in every mode to mirror the marks. */
	texture: boolean
}

/**
 * The legend every cartesian chart mounts from its {@link useChartCartesian}
 * result. It is the one place {@link BarChart}, {@link LineChart},
 * {@link AreaChart}, and {@link ComboChart} share their legend wiring. A new
 * switch or a changed prop therefore lands in all four at once, rather than
 * four identical blocks drifting apart. Renders nothing when no legend resolves,
 * for example a lone series with `legend` unset. A chart therefore hands it
 * straight to the frame's `legend` slot.
 *
 * @internal
 */
export function ChartCartesianLegend({ chart, legend, inert, texture }: ChartCartesianLegendProps) {
	if (!chart.legendItems) return null

	return (
		<ChartLegend
			items={chart.legendItems}
			references={chart.referenceItems}
			hidden={chart.hidden}
			referenceHidden={chart.referenceHidden}
			onToggle={chart.toggleSeries}
			onToggleReference={chart.toggleReference}
			panel={legendAside(legend)}
			maxRows={chart.legendRows}
			texture={texture}
			inert={inert}
		/>
	)
}
