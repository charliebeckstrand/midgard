'use client'

import type { RefObject } from 'react'
import { defineMessages } from '../../../primitives/intl/intl-messages'
import { useIntl } from '../../../primitives/intl/use-intl'
import { MARK_GAP } from '../engine/chart-constants'
import { CALLOUT_CHAR_WIDTH } from '../engine/chart-geometry/pie'
import {
	type MajorityLabel,
	type MajorityMark,
	majorityLabel,
	type SeatFit,
	type SeatLayout,
	seatExtent,
	seatFit,
} from '../engine/chart-geometry/seat'
import { useChartTextWidth } from '../engine/use-chart-text-width'
import { CALLOUT_TEXT_CLASS } from '../sector-chart/sector-chart-callouts'

const messages = defineMessages<{ toWin: { majority: number } }>({
	toWin: {
		id: 'ui.chart.seatsToWin',
		defaultMessage: '{majority, number} to win',
		description:
			'The label above the majority line of a seat chart: the seats for a majority, such as "218 to win".',
	},
})

/** Options for {@link useSeatChartMajority}. @internal */
type SeatChartMajorityOptions = {
	layout: SeatLayout
	/** The majority mark ({@link majorityMark}), or `null` where the chamber has no aisle. */
	mark: MajorityMark | null
	majority: number | undefined
	label: boolean
	/** The size of the frame, in px. */
	width: number
	height: number
}

/** What {@link useSeatChartMajority} returns. @internal */
type SeatChartMajority = {
	/** The fit of the hemicycle, with the room of the marker and of the label. */
	fit: SeatFit
	/** The label above the marker, or `null` where it is off or has no space. */
	label: (MajorityLabel & { text: string }) | null
	/** Attach to an element inside the chart, so that the label measures in its font. */
	hostRef: RefObject<HTMLDivElement | null>
}

/**
 * The fit of a seat chart and the label of its majority mark when `label` is
 * on. The label measures its drawn width, and it shows only where it has the
 * space ({@link majorityLabel}). The fit reserves the room of the label whether
 * it shows or not, so the text never changes the fit.
 *
 * @internal
 */
export function useSeatChartMajority({
	layout,
	mark,
	majority,
	label,
	width,
	height,
}: SeatChartMajorityOptions): SeatChartMajority {
	const intl = useIntl()

	const text =
		label && mark !== null && majority !== undefined
			? intl.formatMessage(messages.toWin, { majority })
			: ''

	const textWidth = useChartTextWidth(
		text === '' ? [] : [text],
		CALLOUT_TEXT_CLASS,
		CALLOUT_CHAR_WIDTH,
	)

	const fit = seatFit(width, height, MARK_GAP, seatExtent(layout), label && mark !== null)

	const placed =
		mark === null || text === ''
			? null
			: majorityLabel({
					mark,
					layout,
					fit,
					width,
					height,
					margin: MARK_GAP,
					textWidth: textWidth.width(text),
				})

	return { fit, label: placed && { ...placed, text }, hostRef: textWidth.hostRef }
}
