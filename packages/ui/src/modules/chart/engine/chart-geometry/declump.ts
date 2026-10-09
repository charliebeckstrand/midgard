/**
 * Pure 1D declump of the labels that a chart stacks along one axis: the pie
 * callouts of one side, and the standing reference labels. Independent of React
 * and styling, so the placement is unit-testable in isolation.
 */

/**
 * One label on the declump axis: the center that it prefers, and half of its
 * extent along the axis. @internal
 */
export type DeclumpSpan = { at: number; half: number }

/**
 * Pushes the spans apart until no two overlap, keeping their order, and keeps
 * each span inside `[low, high]`. Two neighbors keep at least `gap` between
 * their edges. Returns the resolved centers in the input order.
 *
 * @remarks
 * Two passes run, one from each end. The pass from the low end moves each
 * center up to the low edge, and to one gap past the span below it. The pass
 * from the high end moves each center down to the high edge, and to one gap
 * short of the span above it. A center moves only as far as a rule needs, so a
 * label stays as near its anchor as the band lets it.
 *
 * `toward` sets the direction that a crowded run grows: the first pass pushes
 * the run that way, and the second pass holds the far edge. When the spans fit
 * the band, the second pass leaves each span inside both edges. A single slide
 * of the whole run could not keep both edges: a run with one span near the low
 * edge and several near the high edge slid past the low edge, and the slide back
 * pushed its last span past the high edge. When the spans do not fit the band,
 * the edge that the second pass holds wins, and the run overflows the other
 * edge.
 *
 * @internal
 */
export function declump(
	spans: DeclumpSpan[],
	low: number,
	high: number,
	toward: 'low' | 'high',
	gap = 0,
): number[] {
	const order = spans
		.map((span, index) => ({ at: span.at, half: span.half, index }))
		.sort((a, b) => a.at - b.at)

	const fromLow = () => {
		let floor = low

		for (const item of order) {
			item.at = Math.max(item.at, floor + item.half)

			floor = item.at + item.half + gap
		}
	}

	const fromHigh = () => {
		let ceiling = high

		for (let k = order.length - 1; k >= 0; k--) {
			const item = order[k]

			if (!item) continue

			item.at = Math.min(item.at, ceiling - item.half)

			ceiling = item.at - item.half - gap
		}
	}

	if (toward === 'high') {
		fromLow()

		fromHigh()
	} else {
		fromHigh()

		fromLow()
	}

	const resolved = new Array<number>(spans.length)

	for (const item of order) resolved[item.index] = item.at

	return resolved
}
