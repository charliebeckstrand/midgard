// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	LABEL_HEIGHT,
	LABEL_ROW_GAP,
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

	it('stacks crowded labels in rows from the top in a horizontal chart', () => {
		const [target, stretch, ceiling] = referenceLabels(
			[
				{ at: 100, width: 42 },
				{ at: 110, width: 49 },
				{ at: 120, width: 49 },
			],
			'horizontal',
			PLOT,
		)

		// Each label stays centered on its own rule.
		expect([target?.x, stretch?.x, ceiling?.x]).toEqual([100, 110, 120])

		// The first row is flush with the top of the plot.
		expect(target?.y).toBe(PLOT.y + LABEL_HEIGHT / 2)

		// Each crowded label sits one row, a label height and the row gap, under its neighbor.
		expect((stretch?.y ?? 0) - (target?.y ?? 0)).toBe(LABEL_HEIGHT + LABEL_ROW_GAP)

		expect((ceiling?.y ?? 0) - (stretch?.y ?? 0)).toBe(LABEL_HEIGHT + LABEL_ROW_GAP)
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
	it('drops a value label whose box meets a reference label', () => {
		const points = series([
			[10, 50, 5],
			[100, 20, 9],
		])

		const free = valueLabels({ series: [points], plot: PLOT, endpoints: true, extremes: false })

		expect(free.map((label) => label.text)).toEqual(['9', '5'])

		const at = free[0]?.y ?? 0

		const [goal] = drawn(referenceLabels([{ at, width: 28 }], 'vertical', PLOT))

		// A box over the right half of the plot at the height of the last point's label.
		expect(goal?.y).toBe(at)

		const blocked = valueLabels({
			series: [points],
			plot: PLOT,
			endpoints: true,
			extremes: false,
			obstacles: [{ ...(goal?.box as LabelBox), x0: 90 }],
		})

		expect(blocked.map((label) => label.text)).toEqual(['5'])
	})
})
