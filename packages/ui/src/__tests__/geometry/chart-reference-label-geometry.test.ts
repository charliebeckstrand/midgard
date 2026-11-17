// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { LABEL_GAP } from '../../modules/chart/engine/chart-constants'
import {
	LABEL_HEIGHT,
	type LabelBox,
	markerBox,
	type PlacedReferenceLabel,
	referenceLabels,
	type ValueLabelSeries,
	valueLabels,
} from '../../modules/chart/engine/chart-geometry/label'

/** The plot box of the tests: 200 units wide and 100 units high. A label is 7 units wide for each character. */
const PLOT = { x: 0, y: 0, width: 200, height: 100 }

/** A single series over the given `[x, y, value]` points. */
function series(points: [number, number, number][]): ValueLabelSeries {
	return {
		fill: 'fill-blue-600',
		points: points.map(([x, y, value]) => ({ x, y, value })),
		format: String,
	}
}

/** The center of the second label row, the first that a label tries. */
const SECOND_ROW = PLOT.y + LABEL_HEIGHT / 2 + LABEL_HEIGHT + LABEL_GAP

/** Two boxes share area. */
function overlaps(a: LabelBox, b: LabelBox): boolean {
	return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
}

/** The placed labels, without the `null` slots of the rules that draw nothing. */
function drawn(labels: (PlacedReferenceLabel | null)[]): PlacedReferenceLabel[] {
	return labels.filter((label): label is PlacedReferenceLabel => label !== null)
}

describe('referenceLabels', () => {
	it('puts a label on its rule at the right end, flush with the plot, in a vertical chart', () => {
		const [goal] = referenceLabels([{ at: 60, width: 28 }], 'vertical', PLOT)

		expect(goal?.anchor).toBe('end')

		expect(goal?.x).toBe(PLOT.x + PLOT.width)

		expect(goal?.y).toBe(60)
	})

	it('moves a crowded label to the left end of its rule', () => {
		const [target, stretch] = referenceLabels(
			[
				{ at: 60, width: 42 },
				{ at: 57, width: 49 },
			],
			'vertical',
			PLOT,
		)

		expect(target?.anchor).toBe('end')

		expect(stretch?.anchor).toBe('start')

		expect(stretch?.x).toBe(PLOT.x)

		expect(stretch?.y).toBe(57)

		expect(overlaps(target?.box as LabelBox, stretch?.box as LabelBox)).toBe(false)
	})

	it('prefers a spot that no point marker meets', () => {
		const [goal] = referenceLabels([{ at: 60, width: 28 }], 'vertical', PLOT, [
			markerBox({ x: PLOT.x + PLOT.width - 4, y: 61 }),
		])

		expect(goal?.anchor).toBe('start')
	})

	it('keeps the first spot that meets no label where a marker meets every spot', () => {
		const [goal] = referenceLabels([{ at: 60, width: 28 }], 'vertical', PLOT, [
			markerBox({ x: PLOT.x + 4, y: 60 }),
			markerBox({ x: PLOT.x + PLOT.width - 4, y: 60 }),
		])

		expect(goal?.anchor).toBe('end')
	})

	it('drops a label with no free spot, so its rule keeps the tooltip', () => {
		const labels = referenceLabels(
			[
				{ at: 60, width: 7 },
				{ at: 59, width: 7 },
				{ at: 61, width: 7 },
				{ at: 60.5, width: 7 },
				{ at: 59.5, width: 7 },
			],
			'vertical',
			PLOT,
		)

		expect(labels.filter((label) => label === null).length).toBeGreaterThan(0)

		const placed = drawn(labels)

		for (const [index, label] of placed.entries()) {
			for (const other of placed.slice(index + 1)) {
				expect(overlaps(label.box, other.box)).toBe(false)
			}
		}
	})

	it('steps a label off a neighbor rule that its centered spot covers, in a horizontal chart', () => {
		const [good, excellent] = referenceLabels(
			[
				{ at: 100, width: 42 },
				{ at: 110, width: 49 },
			],
			'horizontal',
			PLOT,
		)

		// Each label ends or starts at its own rule, so it covers no other rule.
		expect([good?.anchor, good?.x]).toEqual(['end', 100])

		expect([excellent?.anchor, excellent?.x]).toEqual(['start', 110])

		expect(good?.box.x1).toBeLessThan(110)

		expect(excellent?.box.x0).toBeGreaterThan(100)

		// Both fit the first row that a label tries, one row down from the top.
		expect([good?.y, excellent?.y]).toEqual([SECOND_ROW, SECOND_ROW])
	})

	it('stacks crowded labels in rows from the top in a horizontal chart', () => {
		const [target, stretch, ceiling] = referenceLabels(
			[
				{ at: 100, width: 49 },
				{ at: 101, width: 49 },
				{ at: 102, width: 49 },
			],
			'horizontal',
			PLOT,
		)

		// Each label stays centered on its own rule.
		expect([target?.x, stretch?.x, ceiling?.x]).toEqual([100, 101, 102])

		expect([target?.anchor, stretch?.anchor, ceiling?.anchor]).toEqual([
			'middle',
			'middle',
			'middle',
		])

		// The first row that a label tries is one row down from the top.
		expect(target?.y).toBe(SECOND_ROW)

		// Each crowded label sits one row, a label height and the row gap, under its neighbor.
		expect((stretch?.y ?? 0) - (target?.y ?? 0)).toBe(LABEL_HEIGHT + LABEL_GAP)

		expect((ceiling?.y ?? 0) - (stretch?.y ?? 0)).toBe(LABEL_HEIGHT + LABEL_GAP)
	})

	it('keeps the top row, against the edge of the plot, for last', () => {
		const [release] = referenceLabels(
			[{ at: 100, width: 42, orientation: 'horizontal' }],
			'vertical',
			PLOT,
		)

		expect(release?.y).toBe(SECOND_ROW)

		// A plot three rows high: a value rule through the middle row sends the
		// label to the top row, which no rule comes near.
		const [, crowded] = referenceLabels(
			[
				{ at: SECOND_ROW, width: 28 },
				{ at: 100, width: 42, orientation: 'horizontal' },
			],
			'vertical',
			{ ...PLOT, height: 3 * LABEL_HEIGHT + 2 * LABEL_GAP },
		)

		expect(crowded?.y).toBe(PLOT.y + LABEL_HEIGHT / 2)
	})

	it('moves a label down a row off a rule that runs along the top of its row', () => {
		// A value rule along the top of the second row, and a category rule across it.
		const [, release] = referenceLabels(
			[
				{ at: SECOND_ROW - LABEL_HEIGHT / 2, width: 28 },
				{ at: 100, width: 42, orientation: 'horizontal' },
			],
			'vertical',
			PLOT,
		)

		// The value rule would break for the label in the second row.
		expect(release?.y).toBe(SECOND_ROW + LABEL_HEIGHT + LABEL_GAP)

		expect(release?.anchor).toBe('middle')
	})

	it('prefers a row with room from another rule over a row that only clears the gap', () => {
		// The second row spans y 17 to 30, so a rule at 12 clears it by 5: the gap,
		// but not the room. The third row clears the rule by more than the room.
		const [, release] = referenceLabels(
			[
				{ at: 12, width: 28 },
				{ at: 100, width: 42, orientation: 'horizontal' },
			],
			'vertical',
			PLOT,
		)

		expect(release?.y).toBe(SECOND_ROW + LABEL_HEIGHT + LABEL_GAP)
	})

	it('moves a label off a rule that sits just at the gap from its row, where no row has room', () => {
		// A plot three rows high: the top and bottom rows lie against its edges, and
		// a rule at 13 is just the gap over the middle row, which spans y 17 to 30.
		const [, release] = referenceLabels(
			[
				{ at: SECOND_ROW - LABEL_HEIGHT / 2 - LABEL_GAP, width: 28 },
				{ at: 100, width: 42, orientation: 'horizontal' },
			],
			'vertical',
			{ ...PLOT, height: 3 * LABEL_HEIGHT + 2 * LABEL_GAP },
		)

		// The top row meets the rule, so the label takes the bottom row.
		expect(release?.y).toBe(SECOND_ROW + LABEL_HEIGHT + LABEL_GAP)
	})

	it('places nothing for a rule that draws nothing, and keeps the slots aligned', () => {
		const labels = referenceLabels(
			[
				{ at: null, width: 42 },
				{ at: 40, width: 28 },
			],
			'vertical',
			PLOT,
		)

		expect(labels[0]).toBeNull()

		expect(labels[1]).not.toBeNull()
	})
})

describe('valueLabels against the reference labels', () => {
	it('moves a value label off a reference label, and drops it with no free spot', () => {
		const points = series([
			[10, 50, 5],
			[100, 20, 9],
		])

		const free = valueLabels({ series: [points], plot: PLOT, endpoints: true, extremes: false })

		expect(free.map((label) => label.text)).toEqual(['9', '5'])

		// A reference label on a rule just under the last point, where the flip
		// below the point puts the label of that point.
		const [goal] = drawn(referenceLabels([{ at: 34, width: 28 }], 'vertical', PLOT))

		// The reference label's box, widened over the right half of the plot.
		const right = { ...(goal?.box as LabelBox), x0: 90 }

		const moved = valueLabels({
			series: [points],
			plot: PLOT,
			endpoints: true,
			extremes: false,
			obstacles: [right],
		})

		// The last point is the maximum, so its label stays on the outward side,
		// above the point's line: level with the point, clear of the reference
		// label on the rule. The old flip below the point met that label.
		expect(moved.map((label) => label.text)).toEqual(['9', '5'])

		expect(moved[0]?.y).toBeLessThan(20)

		// A box over every outward spot of the maximum drops its label.
		const blocked = valueLabels({
			series: [points],
			plot: PLOT,
			endpoints: true,
			extremes: false,
			obstacles: [{ x0: 60, x1: 200, y0: 0, y1: 45 }],
		})

		expect(blocked.map((label) => label.text)).toEqual(['5'])
	})
})
