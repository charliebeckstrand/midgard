'use client'

import { MARK_GAP } from '../engine/chart-constants'
import {
	majorityAngle,
	majorityLine,
	type SeatLayout,
	seatExtent,
} from '../engine/chart-geometry/seat'
import type { SeatChartGroup } from './seat-chart'
import { SeatChartMajority } from './seat-chart-majority'
import { SeatChartMarks } from './seat-chart-marks'

/**
 * The size of one unit of the hemicycle in the drawing, in the units of its
 * `viewBox`. The paths round each coordinate to two decimals, so a large unit
 * keeps that rounding far below a pixel.
 */
const UNIT = 1000

/** The fit of the drawing: the center of the arcs at the origin of the `viewBox`. */
const FIT = { scale: UNIT, cx: 0, cy: 0 }

/** Props for {@link SeatChartPrepaint}. @internal */
type SeatChartPrepaintProps = {
	layout: SeatLayout
	owners: number[]
	groups: SeatChartGroup[]
	majority: number | undefined
}

/**
 * The seats of a seat chart before the frame is measured. A seat chart has no
 * text that needs the width of the frame: its fit is one scale and one center
 * (`seatFit`). The fit takes the box of the frame less the margin on each
 * side, and scales the drawing to meet that box, centered in it. An SVG whose
 * `viewBox` is the box of the drawing does the same with
 * `preserveAspectRatio`. Thus the server render draws the seats where the
 * measured frame draws them, at each size. The majority tick keeps the width
 * of its stroke in px.
 *
 * The chart draws it only without a label at the tick and without content in
 * the hole. The label needs the width of its text, and it changes the top
 * margin. The content shows only after it has its size, and the seats show
 * with it.
 *
 * @internal
 */
export function SeatChartPrepaint({ layout, owners, groups, majority }: SeatChartPrepaintProps) {
	const angle = majorityAngle(layout.seats, majority)

	const { top, across, down } = seatExtent(layout.dot, angle !== null)

	const line = angle === null ? null : majorityLine(angle, layout)

	return (
		<div className="absolute" style={{ inset: MARK_GAP }}>
			<svg
				aria-hidden="true"
				// The drawing is physical, as the measured drawing is.
				direction="ltr"
				className="block size-full"
				viewBox={`${(-across / 2) * UNIT} ${-top * UNIT} ${across * UNIT} ${down * UNIT}`}
				preserveAspectRatio="xMidYMid meet"
			>
				<SeatChartMarks
					seats={layout.seats}
					owners={owners}
					groups={groups}
					dot={layout.dot}
					fit={FIT}
				/>

				{line && (
					<SeatChartMajority
						tick={{
							x1: line.x1 * UNIT,
							y1: line.y1 * UNIT,
							x2: line.x2 * UNIT,
							y2: line.y2 * UNIT,
						}}
						callout={null}
						fixedStroke
					/>
				)}
			</svg>
		</div>
	)
}
