'use client'

import { useMemo } from 'react'
import { cn } from '../../../core/cn'
import { k } from '../../../recipes/kata/chart'
import { discsPath, type Seat, type SeatFit } from '../engine/chart-geometry/seat'
import { seriesGroupClass } from '../engine/chart-series'
import { useChartMarkEmphasis } from '../engine/context'
import type { SeatChartGroup } from './seat-chart'

/** The radius of a hollow seat, as a fraction of the radius of a seat. @internal */
const RING_RADIUS = 0.82

/** The stroke of a hollow seat, as a fraction of the radius of a seat. @internal */
const RING_STROKE = 0.36

/** Props for {@link SeatChartMarks}. @internal */
type SeatChartMarksProps = {
	seats: Seat[]
	/** The group of each seat, by seat index, or `-1` for none. */
	owners: number[]
	groups: SeatChartGroup[]
	/** The radius of a seat, in unit space. */
	dot: number
	fit: SeatFit
}

/**
 * The seats of a seat chart: one path for each group, so a chamber of a few
 * hundred seats draws as a few nodes. A hollow group strokes rings in its color.
 * The group under the pointer, or under the keyboard cursor, lights alone, and
 * the rest recede.
 *
 * @internal
 */
export function SeatChartMarks({ seats, owners, groups, dot, fit }: SeatChartMarksProps) {
	const { mark, lit } = useChartMarkEmphasis()

	const paths = useMemo(
		() =>
			groups.map((group, index) => {
				const points = seats.flatMap((seat, at) =>
					owners[at] === index
						? [{ x: fit.cx + seat.x * fit.scale, y: fit.cy + seat.y * fit.scale }]
						: [],
				)

				const r = dot * fit.scale * (group.hollow ? RING_RADIUS : 1)

				return discsPath(points, r)
			}),
		[seats, owners, groups, dot, fit.cx, fit.cy, fit.scale],
	)

	return (
		<g data-slot="chart-seats">
			{groups.map((group, index) => {
				const paint = k.series[group.color]

				return (
					<g key={group.label} className={seriesGroupClass(mark !== null && !lit(index))}>
						<path
							data-slot="chart-seat-group"
							d={paths[index]}
							className={cn(group.hollow ? paint.stroke : paint.fill)}
							fill={group.hollow ? 'none' : undefined}
							strokeWidth={group.hollow ? dot * fit.scale * RING_STROKE : undefined}
						/>
					</g>
				)
			})}
		</g>
	)
}
