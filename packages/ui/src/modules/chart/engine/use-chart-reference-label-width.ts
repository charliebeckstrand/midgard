'use client'

import { useComposedRefs } from 'motion/react'
import { type Ref, useMemo } from 'react'
import { cn } from '../../../core/cn'
import { k } from '../../../recipes/kata/chart'
import { TICK_CHAR_WIDTH } from './chart-constants'
import {
	type ChartReferenceLine,
	isCategoryReference,
	type ReferenceFormat,
} from './chart-reference'
import { ELLIPSIS, graphemeEnds } from './chart-text-width'
import { useChartTextWidth } from './use-chart-text-width'

/** The two parts of a rule's standing label. @internal */
export type ReferenceLabelParts = {
	/** The text that leads, in the label ink: the rule's own label, else its value. */
	lead: string
	/** The value after the rule's own label, one weight lighter, or empty. */
	tail: string
}

/**
 * The parts of a rule's standing label. A value rule shows its own label and
 * then its value, so a consumer gives the name alone. With `withValue` off, or
 * with a `valueDisplay` of `'hover'`, it
 * shows its own label alone, for a label that already holds the value. With no label, it shows
 * its value, which then names the rule. A category rule shows its label only,
 * because the band axis already names its category. A category rule with no
 * label draws none.
 *
 * @internal
 */
export function referenceLabelParts(
	line: ChartReferenceLine,
	format: (value: number) => string,
	withValue = true,
): ReferenceLabelParts {
	if (isCategoryReference(line)) return { lead: line.label ?? '', tail: '' }

	const value = format(line.value)

	if (!line.label) return { lead: value, tail: '' }

	return { lead: line.label, tail: withValue && line.valueDisplay !== 'hover' ? value : '' }
}

/** The space between the two parts of a standing label. @internal */
export const LABEL_PART_SPACE = 4

/** The face of the lead of a standing label, which the measure sets as the label does. @internal */
const LEAD_FACE = cn(k.mark.face)

/** The face of the tail of a standing label, one weight lighter. @internal */
const TAIL_FACE = cn(k.mark.face, 'font-medium')

/** The drawn width of a standing label, from its parts. @internal */
export type ReferenceLabelWidth = (parts: ReferenceLabelParts) => number

/**
 * A standing label cut to fit a room, or `null` where no cut of it fits
 * ({@link useReferenceLabelWidth}). A label that fits comes back whole.
 * @internal
 */
export type ReferenceLabelCut = (
	parts: ReferenceLabelParts,
	room: number,
) => ReferenceLabelParts | null

/**
 * The fewest characters that a cut label keeps before its {@link ELLIPSIS}. A
 * shorter start does not name the rule.
 * @internal
 */
const CUT_MIN_CHARS = 3

/**
 * Each start of `lead` that a cut can keep, with the {@link ELLIPSIS} after
 * it, from the shortest to the longest. Each ends on a whole character.
 * @internal
 */
function leadCuts(lead: string): string[] {
	return graphemeEnds(lead)
		.slice(CUT_MIN_CHARS - 1, -1)
		.map((end) => `${lead.slice(0, end).trimEnd()}${ELLIPSIS}`)
}

/** What {@link useReferenceLabelWidth} returns. @internal */
export type ReferenceLabelMeasure = {
	/** The drawn width of a standing label, or its estimate before the measure. */
	width: ReferenceLabelWidth
	/**
	 * The label cut to fit a room. It drops the tail first, and then cuts the
	 * lead to its longest start that fits, with an {@link ELLIPSIS}.
	 */
	cut: ReferenceLabelCut
	/** Attach to an element inside the chart, so that the probes inherit its font. */
	hostRef: Ref<HTMLDivElement>
}

/**
 * Measures the standing label of each rule in `reference`, in the font of the
 * chart, so that a label takes its spot, and its rule breaks for it, by the
 * real width of the text. The lead and the tail measure in their own weights
 * ({@link useChartTextWidth}), and a label is the two widths and the
 * {@link LABEL_PART_SPACE} between them. Each cut of a lead measures with it,
 * so a cut label takes its width from the font too.
 *
 * @internal
 */
export function useReferenceLabelWidth(
	reference: ChartReferenceLine[] | undefined,
	format: ReferenceFormat,
): ReferenceLabelMeasure {
	const parts = (reference ?? []).map((line) =>
		referenceLabelParts(line, (value) => format(value, line.axis ?? 'y')),
	)

	const leads = useChartTextWidth(
		parts.flatMap(({ lead }) => [lead, ...leadCuts(lead)]),
		LEAD_FACE,
		TICK_CHAR_WIDTH,
	)

	const tails = useChartTextWidth(
		parts.map(({ tail }) => tail),
		TAIL_FACE,
		TICK_CHAR_WIDTH,
	)

	const hostRef = useComposedRefs(leads.hostRef, tails.hostRef)

	return useMemo(() => {
		const width: ReferenceLabelWidth = ({ lead, tail }) =>
			(lead ? leads.width(lead) : 0) + (tail ? LABEL_PART_SPACE + tails.width(tail) : 0)

		const cut: ReferenceLabelCut = (parts, room) => {
			if (width(parts) <= room) return parts

			if (parts.tail && leads.width(parts.lead) <= room) return { lead: parts.lead, tail: '' }

			const lead = leadCuts(parts.lead).findLast((text) => leads.width(text) <= room)

			return lead === undefined ? null : { lead, tail: '' }
		}

		return { width, cut, hostRef }
	}, [leads, tails, hostRef])
}
