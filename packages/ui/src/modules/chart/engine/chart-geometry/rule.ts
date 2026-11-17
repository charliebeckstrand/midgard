/**
 * Pure dash geometry of a reference rule: the pieces that a rule draws between
 * its breaks, and the dash pattern that draws them. Independent of React and
 * styling, so the geometry is unit-testable in isolation.
 */

import { REFERENCE_DASH_OFF, REFERENCE_DASH_ON } from '../chart-constants'

/** A span along a rule, from its start, where the rule draws nothing. @internal */
export type RuleBreak = { from: number; to: number }

/**
 * The pieces of a rule of `length` that remain between its `breaks`, each as
 * a span from the start of the rule. The breaks are clamped to the rule and
 * merged where they meet. A piece shorter than one unit is too short to see,
 * so it joins the breaks.
 *
 * @internal
 */
export function rulePieces(length: number, breaks: readonly RuleBreak[]): RuleBreak[] {
	const sorted = breaks
		.map(({ from, to }) => ({ from: Math.max(0, from), to: Math.min(length, to) }))
		.filter(({ from, to }) => to > from)
		.sort((a, b) => a.from - b.from)

	const pieces: RuleBreak[] = []

	let at = 0

	for (const cut of [...sorted, { from: length, to: length }]) {
		if (cut.from - at >= 1) pieces.push({ from: at, to: cut.from })

		at = Math.max(at, cut.to)
	}

	return pieces
}

/**
 * The `stroke-dasharray` of a rule of `length` with `breaks`, from its start:
 * a list of drawn and empty lengths, in turn. Each piece between two breaks
 * fits a whole number of dashes, so it starts and ends on a full dash, and the
 * clear space at each side of a break is the break alone. The fit scales the
 * dash and the gap of a piece together, by the least amount. A piece shorter
 * than one dash draws as one short dash. A solid rule (`dashed` off) draws each
 * piece whole. The list ends with an empty length that covers the rest of the
 * rule, so the pattern never repeats. `undefined` for a solid rule with no
 * break, which needs no pattern.
 *
 * @internal
 */
export function ruleDashArray(
	length: number,
	breaks: readonly RuleBreak[],
	dashed: boolean,
): number[] | undefined {
	const pieces = rulePieces(length, breaks)

	if (!dashed && pieces.length === 1 && pieces[0]?.from === 0 && pieces[0]?.to === length) {
		return undefined
	}

	// Nothing remains: one empty length over the whole rule.
	if (pieces.length === 0) return [0, length]

	const pattern: number[] = []

	let at = 0

	for (const { from, to } of pieces) {
		// The empty length before the piece. The pattern starts with a drawn
		// length, so a rule that starts with a break draws a zero first.
		if (pattern.length > 0) pattern.push(from - at)
		else if (from > 0) pattern.push(0, from)

		const span = to - from

		if (dashed) pattern.push(...fitDashes(span))
		else pattern.push(span)

		at = to
	}

	// The rest of the rule, empty and longer than the rule, so the pattern does not repeat.
	pattern.push(length - at + length)

	return pattern
}

/**
 * The drawn and empty lengths of one dashed piece of `span`: a whole number of
 * dashes, which start and end the piece. The dash and the gap scale together
 * to fill the span. @internal
 */
function fitDashes(span: number): number[] {
	const period = REFERENCE_DASH_ON + REFERENCE_DASH_OFF

	const count = Math.max(1, Math.round((span + REFERENCE_DASH_OFF) / period))

	const scale = span / (count * period - REFERENCE_DASH_OFF)

	return Array.from({ length: 2 * count - 1 }, (_, index) =>
		index % 2 === 0 ? REFERENCE_DASH_ON * scale : REFERENCE_DASH_OFF * scale,
	)
}
