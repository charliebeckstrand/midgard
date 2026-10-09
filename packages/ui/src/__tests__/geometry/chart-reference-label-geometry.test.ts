// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	LABEL_HEIGHT,
	type LabelBox,
	type PlacedReferenceLabel,
	referenceLabels,
	type ValueLabelSeries,
	valueLabels,
} from '../../modules/chart/engine/chart-geometry/label'

/** The plot box of the tests: 200 units wide and 100 units high. */
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
	it('puts a label at the far end of its rule, above it, in a vertical chart', () => {
		const [goal] = referenceLabels([{ at: 60, text: 'Goal' }], 'vertical', PLOT)

		expect(goal?.anchor).toBe('end')

		expect(goal?.x).toBe(PLOT.x + PLOT.width)

		expect(goal?.y).toBeLessThan(60)
	})

	it('flips a crowded label below its rule, at the same end', () => {
		const [target, stretch] = referenceLabels(
			[
				{ at: 60, text: 'Target' },
				{ at: 57, text: 'Stretch' },
			],
			'vertical',
			PLOT,
		)

		expect(target?.anchor).toBe('end')

		expect(target?.y).toBeLessThan(60)

		expect(stretch?.anchor).toBe('end')

		expect(stretch?.y).toBeGreaterThan(57)

		expect(overlaps(target?.box as LabelBox, stretch?.box as LabelBox)).toBe(false)
	})

	it('prefers a spot that no other rule crosses', () => {
		const [target] = referenceLabels(
			[
				{ at: 60, text: 'Target' },
				{ at: 50, text: 'Stretch' },
			],
			'vertical',
			PLOT,
		)

		// Above, the label would sit over the Stretch rule, so it goes below its own.
		expect(target?.anchor).toBe('end')

		expect(target?.y).toBeGreaterThan(60)
	})

	it('drops a label with no free spot, so its rule keeps the tooltip', () => {
		const labels = referenceLabels(
			[
				{ at: 60, text: 'A' },
				{ at: 59, text: 'B' },
				{ at: 61, text: 'C' },
				{ at: 60.5, text: 'D' },
				{ at: 59.5, text: 'E' },
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
				{ at: 100, text: 'Target' },
				{ at: 110, text: 'Stretch' },
				{ at: 120, text: 'Ceiling' },
			],
			'horizontal',
			PLOT,
		)

		// Each label stays centered on its own rule.
		expect([target?.x, stretch?.x, ceiling?.x]).toEqual([100, 110, 120])

		// Each crowded label sits one label height under its neighbor.
		expect((stretch?.y ?? 0) - (target?.y ?? 0)).toBe(LABEL_HEIGHT)

		expect((ceiling?.y ?? 0) - (stretch?.y ?? 0)).toBe(LABEL_HEIGHT)
	})

	it('places nothing for a rule that draws nothing, and keeps the slots aligned', () => {
		const labels = referenceLabels(
			[
				{ at: null, text: 'Hidden' },
				{ at: 40, text: 'Goal' },
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

		const [goal] = drawn(referenceLabels([{ at: 20, text: 'Goal' }], 'vertical', PLOT))

		// A box over the right half of the plot at the height of the last point's label.
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
