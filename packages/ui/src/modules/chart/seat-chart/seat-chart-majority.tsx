import { cn } from '../../../core/cn'
import { k } from '../../../recipes/kata/chart'
import { CALLOUT_TEXT_CLASS } from '../sector-chart/sector-chart-callouts'
import type { SeatChartMajorityMark } from './use-seat-chart-majority'

/**
 * The majority mark of a {@link SeatChart}: a tick past the outer arc in the
 * strong ink, and, where it has the space, a callout label beside the outer end
 * of the tick. A short nub turns from the tick toward the label, as a callout
 * leader turns toward its label.
 *
 * @internal
 */
export function SeatChartMajority({
	tick,
	callout,
	fixedStroke = false,
}: SeatChartMajorityMark & {
	/** The drawing scales to its box, so the stroke keeps its width in px. */
	fixedStroke?: boolean
}) {
	return (
		<g pointerEvents="none">
			<line
				data-slot="chart-majority"
				{...tick}
				strokeWidth={1.5}
				vectorEffect={fixedStroke ? 'non-scaling-stroke' : undefined}
				strokeLinecap="round"
				className={cn(k.majority)}
			/>

			{callout && (
				<>
					<line
						data-slot="chart-majority-nub"
						{...callout.nub}
						strokeWidth={1.5}
						strokeLinecap="round"
						className={cn(k.majority)}
					/>

					<text
						data-slot="chart-majority-label"
						x={callout.x}
						y={callout.y}
						textAnchor={callout.anchor}
						dominantBaseline="central"
						className={CALLOUT_TEXT_CLASS}
					>
						{callout.text}
					</text>
				</>
			)}
		</g>
	)
}
