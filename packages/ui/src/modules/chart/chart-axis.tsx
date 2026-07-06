import { cn } from '../../core'
import { k } from '../../recipes/kata/chart'
import { GUTTER_GAP } from './chart-constants'
import type { ChartAxisTitlePlacement, PlotRect } from './chart-layout'

/** One rendered tick: its position along the axis and its label. @internal */
export type ChartAxisTick = {
	/** Position in `viewBox` units: an x for the x axis, a y for the y axis. */
	at: number
	label: string
	/**
	 * Stable React identity across resizes — the tick's own value (linear axes),
	 * category index (bands), or instant (time), never the mapped {@link
	 * ChartAxisTick.at}. A collapsed plot maps every tick onto one coordinate (a
	 * zero-height value range, a zero-width band), so `at` is not unique there and
	 * would strand a duplicate-key node that ghosts on resize-back; the identity
	 * is. Distinct whenever there are two or more ticks — a value axis only repeats
	 * a value on a zero-span domain, which yields at most one tick.
	 */
	key: string | number
	/** Degrees the label tilts about `at`; unset draws it flat. Category ticks only. */
	rotate?: number
}

/** Props for {@link ChartAxis}. @internal */
export type ChartAxisProps = {
	/** Which screen axis to draw along: `x` a horizontal band, `y` a vertical gutter. */
	axis: 'x' | 'y'
	plot: PlotRect
	ticks: ChartAxisTick[]
	/**
	 * Which side of the plot the labels line: the y axis reads `'left'` (the
	 * default) or `'right'` — a dual-axis chart's secondary gutter — and the x
	 * axis `'bottom'` (the default) or `'top'`, the same secondary axis under the
	 * horizontal transpose.
	 */
	position?: 'left' | 'right' | 'top' | 'bottom'
	/**
	 * The axis line's position along the cross axis — the zero line once negative
	 * values pull it off the plot edge. The x axis reads it as a y (a horizontal
	 * rule) and defaults to the plot floor; the y axis reads it as an x (a
	 * vertical rule, for a horizontal chart's category baseline) and draws no line
	 * without it.
	 */
	baseline?: number
	/**
	 * Draw the x axis's baseline rule. A horizontal chart's value axis sits on the
	 * bottom and, like the vertical chart's left value axis, carries no line —
	 * only the gridlines.
	 * @defaultValue true
	 */
	line?: boolean
}

/**
 * One chart axis: the x axis draws the bottom baseline with labels under their
 * positions; the y axis right-aligns labels in the gutter and draws a line only
 * for a horizontal chart's category baseline, otherwise leaving the rule to the
 * gridlines and keeping the chrome recessive. `position` flips either to the
 * plot's far side — labels left-aligned in the right gutter, or hung above the
 * top edge — for a dual-axis chart's secondary scale. An x tick carrying
 * `rotate` draws end-anchored and pivots about its own position instead of
 * hanging centered under it.
 *
 * @internal
 */
export function ChartAxis({ axis, plot, ticks, position, baseline, line = true }: ChartAxisProps) {
	if (axis === 'y') {
		const right = position === 'right'

		return (
			<g data-slot={right ? 'chart-axis-y-right' : 'chart-axis-y'}>
				{baseline !== undefined && (
					<line
						x1={baseline}
						y1={plot.y}
						x2={baseline}
						y2={plot.y + plot.height}
						strokeWidth={1}
						shapeRendering="crispEdges"
						className={cn(k.axis)}
					/>
				)}

				{ticks.map((tick) => (
					<text
						key={tick.key}
						x={right ? plot.x + plot.width + GUTTER_GAP : plot.x - GUTTER_GAP}
						y={tick.at}
						textAnchor={right ? 'start' : 'end'}
						dominantBaseline="central"
						className={cn(k.tick)}
					>
						{tick.label}
					</text>
				))}
			</g>
		)
	}

	const top = position === 'top'

	const floor = plot.y + plot.height

	const lineY = baseline ?? floor

	return (
		<g data-slot={top ? 'chart-axis-x-top' : 'chart-axis-x'}>
			{line && !top && (
				<line
					x1={plot.x}
					y1={lineY}
					x2={plot.x + plot.width}
					y2={lineY}
					strokeWidth={1}
					shapeRendering="crispEdges"
					className={cn(k.axis)}
				/>
			)}

			{ticks.map((tick) => {
				const y = top ? plot.y - GUTTER_GAP : floor + GUTTER_GAP

				return (
					<text
						key={tick.key}
						x={tick.at}
						y={y}
						textAnchor={tick.rotate ? 'end' : 'middle'}
						dominantBaseline={tick.rotate ? 'middle' : top ? 'auto' : 'hanging'}
						transform={tick.rotate ? `rotate(${tick.rotate} ${tick.at} ${y})` : undefined}
						className={cn(k.tick)}
					>
						{tick.label}
					</text>
				)
			})}
		</g>
	)
}

/** Props for {@link ChartAxisTitles}. @internal */
export type ChartAxisTitlesProps = {
	/** The layout's placed titles; empty draws nothing. */
	titles: ChartAxisTitlePlacement[]
}

/**
 * The value-axis titles, drawn in the bands the layout reserved for them: a
 * rotated label along each titled vertical gutter, a horizontal one under (or
 * over) each titled band axis. Pure chrome — non-interactive, and outside the
 * readout, which names series through the legend and tooltip instead.
 *
 * @internal
 */
export function ChartAxisTitles({ titles }: ChartAxisTitlesProps) {
	if (titles.length === 0) return null

	return (
		<g data-slot="chart-axis-titles">
			{titles.map((title) => (
				<text
					key={`${title.x}:${title.y}`}
					x={title.x}
					y={title.y}
					textAnchor="middle"
					dominantBaseline="central"
					transform={title.rotate ? `rotate(${title.rotate} ${title.x} ${title.y})` : undefined}
					className={cn(k.axisTitle)}
				>
					{title.text}
				</text>
			))}
		</g>
	)
}
