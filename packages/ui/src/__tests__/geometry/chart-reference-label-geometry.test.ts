// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { LABEL_INSET, LABEL_ROOM } from '../../modules/chart/engine/chart-constants'
import {
	LABEL_HEIGHT,
	type LabelBox,
	type LabelLine,
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

/** The center of the first label in a horizontal chart that keeps the room from the top of the plot. */
const OPEN_TOP = PLOT.y + LABEL_ROOM + LABEL_HEIGHT / 2

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
		const [goal] = referenceLabels([{ at: 60, width: 28 }], 'vertical', PLOT, {
			markers: [markerBox({ x: PLOT.x + PLOT.width - 4, y: 61 })],
		})

		expect(goal?.anchor).toBe('start')
	})

	it('keeps the first spot that meets no label where a marker meets every spot', () => {
		const [goal] = referenceLabels([{ at: 60, width: 28 }], 'vertical', PLOT, {
			markers: [
				markerBox({ x: PLOT.x + 4, y: 60 }),
				markerBox({ x: PLOT.x + PLOT.width - 4, y: 60 }),
			],
		})

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

	it('insets a label that cannot center past its rule, in a horizontal chart', () => {
		// The centered label covers the rule at 125, and the label that ends the
		// inset past its rule keeps the room from it.
		const [goal] = referenceLabels(
			[
				{ at: 100, width: 42 },
				{ at: 125, width: 0, unlabeled: true },
			],
			'horizontal',
			PLOT,
		)

		expect([goal?.anchor, goal?.x]).toEqual(['end', 100 + LABEL_INSET])

		expect(goal?.box.x1).toBeLessThanOrEqual(125 - LABEL_ROOM)
	})

	it('stops an inset label flush with the side of the plot near its rule', () => {
		const [near, far] = referenceLabels(
			[
				{ at: PLOT.x + 4, width: 42 },
				{ at: PLOT.x + PLOT.width - 4, width: 42 },
			],
			'horizontal',
			PLOT,
		)

		expect([near?.anchor, near?.x]).toEqual(['start', PLOT.x])

		expect([far?.anchor, far?.x]).toEqual(['end', PLOT.x + PLOT.width])
	})

	it('steps a label off a neighbor rule, with room from the rule and from the label beside it, in a horizontal chart', () => {
		const [good, excellent] = referenceLabels(
			[
				{ at: 100, width: 42 },
				{ at: 110, width: 49 },
			],
			'horizontal',
			PLOT,
		)

		// Each label ends or starts at its own rule, so it covers no other rule.
		expect([good?.anchor, good?.x, good?.y]).toEqual(['end', 100, OPEN_TOP])

		expect([excellent?.anchor, excellent?.x]).toEqual(['start', 110])

		expect(good?.box.x1).toBeLessThan(110)

		expect(excellent?.box.x0).toBeGreaterThan(100)

		// The second label keeps the room from the first.
		expect(excellent?.box.y0).toBe((good?.box.y1 ?? 0) + LABEL_ROOM)
	})

	it('stacks crowded labels the room apart, down from the top, in a horizontal chart', () => {
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

		expect(target?.y).toBe(OPEN_TOP)

		expect((stretch?.y ?? 0) - (target?.y ?? 0)).toBe(LABEL_HEIGHT + LABEL_ROOM)

		expect((ceiling?.y ?? 0) - (stretch?.y ?? 0)).toBe(LABEL_HEIGHT + LABEL_ROOM)
	})

	it('keeps the room from the top of the plot and from a rule across the label', () => {
		const [release] = referenceLabels(
			[{ at: 100, width: 42, orientation: 'horizontal' }],
			'vertical',
			PLOT,
		)

		expect(release?.y).toBe(OPEN_TOP)

		// A value rule at y 20 crosses the first open spot, so the label moves
		// down until its top is the room under the rule.
		const [, crowded] = referenceLabels(
			[
				{ at: 20, width: 28 },
				{ at: 100, width: 42, orientation: 'horizontal' },
			],
			'vertical',
			PLOT,
		)

		expect(crowded?.box.y0).toBe(20 + LABEL_ROOM)

		expect(crowded?.anchor).toBe('middle')
	})

	it('crosses a rule where every spot does, rather than drop the label', () => {
		// A plot two label heights high, with a value rule through its middle.
		const plot = { ...PLOT, height: 2 * LABEL_HEIGHT }

		const [, release] = referenceLabels(
			[
				{ at: LABEL_HEIGHT, width: 28 },
				{ at: 100, width: 42, orientation: 'horizontal' },
			],
			'vertical',
			plot,
		)

		expect(release).not.toBeNull()
	})

	it('keeps clear of a line of the data, with room', () => {
		// A line near the top of the plot.
		const line: LabelLine = {
			points: [
				{ x: 0, y: 20 },
				{ x: 100, y: 15 },
				{ x: 200, y: 25 },
			],
			smooth: false,
		}

		const [release] = referenceLabels([{ at: 100, width: 42 }], 'horizontal', PLOT, {
			lines: [line],
		})

		// The label sits just under the line, the room clear of it: the line is
		// between y 15 and y 20 across any spot.
		expect(release?.box.y0).toBeGreaterThanOrEqual(15 + LABEL_ROOM)

		expect(release?.box.y0).toBeLessThanOrEqual(20 + LABEL_ROOM + 1)
	})

	it('crosses a rule before it covers the data, where a spot must do one', () => {
		// The label is wider than the space to the next rule, so each spot crosses
		// that rule. A line runs over the top half of the plot.
		const line: LabelLine = {
			points: [
				{ x: 0, y: 10 },
				{ x: 200, y: 30 },
			],
			smooth: false,
		}

		const [hold] = referenceLabels(
			[
				{ at: 20, width: 160 },
				{ at: 170, width: 0, unlabeled: true },
			],
			'horizontal',
			PLOT,
			{ lines: [line] },
		)

		expect(hold?.anchor).toBe('start')

		// The line is under y 28 across the label.
		expect(hold?.box.y0).toBeGreaterThanOrEqual(28 + LABEL_ROOM)
	})

	it('treats a smooth line as the box of each two neighbor points', () => {
		const points = [
			{ x: 50, y: 0 },
			{ x: 150, y: 100 },
		]

		const [straight] = referenceLabels([{ at: 60, width: 7 }], 'horizontal', PLOT, {
			lines: [{ points, smooth: false }],
		})

		// The straight line runs under y 24.5 beside the label, so the label
		// keeps the room under it.
		expect(straight?.box.y0).toBeGreaterThanOrEqual(24.5)

		const [smooth] = referenceLabels([{ at: 60, width: 7 }], 'horizontal', PLOT, {
			lines: [{ points, smooth: true }],
		})

		// The curve can be anywhere in the box of its two points, which covers the
		// label at every height.
		expect(smooth?.y).not.toBe(straight?.y)
	})

	it('cuts a label short of the next rule, with room, where every whole spot crosses it', () => {
		// A cut keeps whole 7-unit characters, and needs three of them.
		const cut = (room: number) => (room >= 21 ? Math.min(160, Math.floor(room / 7) * 7) : null)

		const [hold] = referenceLabels(
			[
				{ at: 20, width: 160, cut },
				{ at: 170, width: 0, unlabeled: true },
			],
			'horizontal',
			PLOT,
		)

		expect(hold?.cut).toBe(true)

		expect(hold?.anchor).toBe('start')

		expect(hold?.width).toBeLessThan(160)

		// The box ends the room short of the rule, and no less than a character short.
		expect(hold?.box.x1).toBeLessThanOrEqual(170 - LABEL_ROOM)

		expect(hold?.box.x1).toBeGreaterThan(170 - LABEL_ROOM - 7)
	})

	it('keeps a whole label that a free spot holds, and crosses a rule where no cut fits', () => {
		const cut = (room: number) => (room >= 21 ? Math.min(28, room) : null)

		const [whole] = referenceLabels(
			[
				{ at: 20, width: 28, cut },
				{ at: 170, width: 0, unlabeled: true },
			],
			'horizontal',
			PLOT,
		)

		expect(whole?.cut).toBeUndefined()

		// The next rule leaves less room than three characters.
		const [crossed] = referenceLabels(
			[
				{ at: 20, width: 160, cut },
				{ at: 30, width: 0, unlabeled: true },
			],
			'horizontal',
			{ ...PLOT, x: 10 },
		)

		expect(crossed?.cut).toBeUndefined()

		expect(crossed?.width).toBe(160)
	})

	it('cuts the label at the end of a value rule short of a category rule across it', () => {
		const cut = (room: number) => (room >= 21 ? Math.min(140, Math.floor(room / 7) * 7) : null)

		// A category rule at 120 crosses both ends of the value rule at 50.
		const [goal] = referenceLabels(
			[
				{ at: 50, width: 140, cut },
				{ at: 120, width: 0, unlabeled: true, orientation: 'horizontal' },
			],
			'vertical',
			PLOT,
		)

		expect([goal?.anchor, goal?.x, goal?.cut]).toEqual(['end', PLOT.x + PLOT.width, true])

		expect(goal?.box.x0).toBeGreaterThanOrEqual(120 + LABEL_ROOM)
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
