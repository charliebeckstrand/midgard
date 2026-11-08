'use client'

import type { RefObject } from 'react'
import { defineMessages } from '../../../primitives/intl/intl-messages'
import { useIntl } from '../../../primitives/intl/use-intl'
import { MARK_GAP } from '../engine/chart-constants'
import { CALLOUT_CHAR_WIDTH } from '../engine/chart-geometry/pie'
import {
	type MajorityCallout,
	majorityAngle,
	majorityCallout,
	majorityLine,
	type SeatFit,
	type SeatLayout,
	seatFit,
} from '../engine/chart-geometry/seat'
import { useChartTextWidth } from '../engine/use-chart-text-width'
import { CALLOUT_TEXT_CLASS } from '../sector-chart/sector-chart-callouts'

const messages = defineMessages<{ toWin: { majority: number } }>({
	toWin: {
		id: 'ui.chart.seatsToWin',
		defaultMessage: '{majority, number} to win',
		description:
			'The label beside the majority mark of a seat chart: the seats for a majority, such as "218 to win".',
	},
})

/** The majority mark of a seat chart, in px in the frame. @internal */
export type SeatChartMajorityMark = {
	/** The tick past the outer arc. */
	tick: { x1: number; y1: number; x2: number; y2: number }
	/** The label beside the tick, or `null` where it is off or has no space. */
	callout: (MajorityCallout & { text: string }) | null
}

/** Options for {@link useSeatChartMajority}. @internal */
type SeatChartMajorityOptions = {
	layout: SeatLayout
	majority: number | undefined
	label: boolean
	/** The size of the frame, in px. */
	width: number
	height: number
}

/** What {@link useSeatChartMajority} returns. @internal */
type SeatChartMajority = {
	/** The fit of the hemicycle, with the room of the tick and of the label. */
	fit: SeatFit
	/** The majority mark, or `null` without a majority inside the chamber. */
	mark: SeatChartMajorityMark | null
	/** Attach to an element inside the chart, so that the label measures in its font. */
	hostRef: RefObject<HTMLDivElement | null>
}

/**
 * The fit of a seat chart and its majority mark: the tick, and the callout
 * label beside it when `label` is on. The label measures its drawn width, and
 * it shows only where it has the space ({@link majorityCallout}). The fit
 * reserves the room of the label whether it shows or not, so the text never
 * changes the fit.
 *
 * @internal
 */
export function useSeatChartMajority({
	layout,
	majority,
	label,
	width,
	height,
}: SeatChartMajorityOptions): SeatChartMajority {
	const intl = useIntl()

	const angle = majorityAngle(layout.seats, majority)

	const text =
		label && angle !== null && majority !== undefined
			? intl.formatMessage(messages.toWin, { majority })
			: ''

	const textWidth = useChartTextWidth(
		text === '' ? [] : [text],
		CALLOUT_TEXT_CLASS,
		CALLOUT_CHAR_WIDTH,
	)

	const fit = seatFit(width, height, MARK_GAP, layout.dot, angle !== null, label)

	if (angle === null) return { fit, mark: null, hostRef: textWidth.hostRef }

	const line = majorityLine(angle, layout)

	const placed =
		text === ''
			? null
			: majorityCallout({
					angle,
					layout,
					fit,
					width,
					height,
					margin: MARK_GAP,
					textWidth: textWidth.width(text),
				})

	return {
		fit,
		mark: {
			tick: {
				x1: fit.cx + line.x1 * fit.scale,
				y1: fit.cy + line.y1 * fit.scale,
				x2: fit.cx + line.x2 * fit.scale,
				y2: fit.cy + line.y2 * fit.scale,
			},
			callout: placed && { ...placed, text },
		},
		hostRef: textWidth.hostRef,
	}
}
