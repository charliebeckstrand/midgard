import { cn } from '../../../core/cn'
import { k } from '../../../recipes/kata/chart'
import { coord } from '../engine/chart-coords'
import type { MajorityLabel, MajorityMark, SeatFit } from '../engine/chart-geometry/seat'
import { CALLOUT_TEXT_CLASS } from '../sector-chart/sector-chart-callouts'

/** Props for {@link SeatChartMajority}. @internal */
type SeatChartMajorityProps = {
	/** The mark in unit space ({@link majorityMark}). */
	mark: MajorityMark
	fit: SeatFit
	/** The label above the marker, or `null` where it is off or has no space. */
	label: (MajorityLabel & { text: string }) | null
	/** The drawing scales to its box, so the stroke keeps its width in px. */
	fixedStroke?: boolean
}

/**
 * The majority mark of a {@link SeatChart} in the strong ink: a dashed line
 * down the aisle to the hole, a triangle marker at its outer end, and, where it
 * has the space, a label above the marker. The dashes are geometry in unit
 * space, not a dash pattern, so the line draws the same dashes before and
 * after the frame is measured.
 *
 * @internal
 */
export function SeatChartMajority({
	mark,
	fit,
	label,
	fixedStroke = false,
}: SeatChartMajorityProps) {
	const x = (value: number) => coord(fit.cx + value * fit.scale)

	const y = (value: number) => coord(fit.cy + value * fit.scale)

	const dashes = mark.dashes
		.map((dash) => `M${x(dash.x1)} ${y(dash.y1)}L${x(dash.x2)} ${y(dash.y2)}`)
		.join('')

	const marker = mark.marker.map((point) => `${x(point.x)},${y(point.y)}`).join(' ')

	const vectorEffect = fixedStroke ? 'non-scaling-stroke' : undefined

	return (
		<g pointerEvents="none">
			<path
				data-slot="chart-majority"
				d={dashes}
				fill="none"
				strokeWidth={1.5}
				vectorEffect={vectorEffect}
				className={cn(k.majority)}
			/>

			<polygon
				data-slot="chart-majority-marker"
				points={marker}
				strokeWidth={1.5}
				strokeLinejoin="round"
				vectorEffect={vectorEffect}
				className={cn(k.majority)}
			/>

			{label && (
				<text
					data-slot="chart-majority-label"
					x={label.x}
					y={label.y}
					textAnchor="middle"
					dominantBaseline="central"
					className={CALLOUT_TEXT_CLASS}
				>
					{label.text}
				</text>
			)}
		</g>
	)
}
