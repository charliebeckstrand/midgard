import { describe, expect, it } from 'vitest'
import { LineChart } from '../../modules/chart/line-chart'
import { PieChart } from '../../modules/chart/pie-chart'
import {
	type ChartFocusTargets,
	clampCursor,
	cursorPoint,
	firstCursor,
	hasFocusTargets,
	moveCursor,
} from '../../modules/chart/use-chart-keyboard'
import { act, bySlot, fireEvent, renderUI } from '../helpers'

// Category 0 carries two coincident points (a chart whose series overlap on the
// same value); the later categories separate them.
const TARGETS: ChartFocusTargets = {
	bandPositions: [10, 20, 30],
	valuePoints: [
		[100, 100],
		[80, 60],
		[40, 40],
	],
}

// A middle category with no finite value — a gap the cursor must step over.
const GAPPED: ChartFocusTargets = {
	bandPositions: [10, 20, 30],
	valuePoints: [[100], [], [40]],
}

describe('chart keyboard cursor', () => {
	it('reports whether any category is navigable', () => {
		expect(hasFocusTargets(TARGETS)).toBe(true)

		expect(hasFocusTargets({ bandPositions: [10, 20], valuePoints: [[], []] })).toBe(false)
	})

	it('opens on the first focusable category, skipping a leading gap', () => {
		expect(firstCursor(TARGETS)).toEqual({ category: 0, value: 0 })

		expect(firstCursor({ bandPositions: [10, 20], valuePoints: [[], [50]] })).toEqual({
			category: 1,
			value: 0,
		})

		expect(firstCursor({ bandPositions: [10], valuePoints: [[]] })).toBeNull()
	})

	it('cycles every series value at a category — coincident points included', () => {
		// Category 0's two points share a value; cycling must still visit both, so a
		// chart whose series overlap steps through each rather than collapsing to one.
		const first = moveCursor({ category: 0, value: 0 }, 'ArrowDown', TARGETS, 'vertical')

		expect(first).toEqual({ handled: true, cursor: { category: 0, value: 1 } })

		const wrapped = moveCursor({ category: 0, value: 1 }, 'ArrowDown', TARGETS, 'vertical')

		expect(wrapped).toEqual({ handled: true, cursor: { category: 0, value: 0 } })

		// The reverse arrow cycles the other way across the same two points.
		expect(moveCursor({ category: 0, value: 0 }, 'ArrowUp', TARGETS, 'vertical')).toEqual({
			handled: true,
			cursor: { category: 0, value: 1 },
		})
	})

	it('walks categories with the band axis arrows, carrying the value lane', () => {
		expect(moveCursor({ category: 0, value: 1 }, 'ArrowRight', TARGETS, 'vertical')).toEqual({
			handled: true,
			cursor: { category: 1, value: 1 },
		})

		expect(moveCursor({ category: 1, value: 0 }, 'ArrowLeft', TARGETS, 'vertical')).toEqual({
			handled: true,
			cursor: { category: 0, value: 0 },
		})
	})

	it('clamps at the ends instead of wrapping the category axis', () => {
		expect(moveCursor({ category: 2, value: 0 }, 'ArrowRight', TARGETS, 'vertical')).toEqual({
			handled: true,
			cursor: { category: 2, value: 0 },
		})

		expect(moveCursor({ category: 0, value: 0 }, 'ArrowLeft', TARGETS, 'vertical')).toEqual({
			handled: true,
			cursor: { category: 0, value: 0 },
		})
	})

	it('steps over an empty category rather than landing on it', () => {
		expect(moveCursor({ category: 0, value: 0 }, 'ArrowRight', GAPPED, 'vertical')).toEqual({
			handled: true,
			cursor: { category: 2, value: 0 },
		})
	})

	it('jumps to the ends with Home and End', () => {
		expect(moveCursor({ category: 1, value: 0 }, 'Home', TARGETS, 'vertical').cursor).toEqual({
			category: 0,
			value: 0,
		})

		expect(moveCursor({ category: 0, value: 0 }, 'End', TARGETS, 'vertical').cursor).toEqual({
			category: 2,
			value: 0,
		})
	})

	it('clears on Escape and ignores keys it does not own', () => {
		expect(moveCursor({ category: 1, value: 0 }, 'Escape', TARGETS, 'vertical')).toEqual({
			handled: true,
			cursor: null,
		})

		expect(moveCursor({ category: 1, value: 0 }, 'a', TARGETS, 'vertical')).toEqual({
			handled: false,
			cursor: { category: 1, value: 0 },
		})
	})

	it('transposes the axes when the chart faces horizontally', () => {
		// Categories run down the side, so the vertical arrows walk them and the
		// horizontal arrows cycle the series values.
		expect(moveCursor({ category: 0, value: 0 }, 'ArrowDown', TARGETS, 'horizontal')).toEqual({
			handled: true,
			cursor: { category: 1, value: 0 },
		})

		expect(moveCursor({ category: 0, value: 0 }, 'ArrowRight', TARGETS, 'horizontal')).toEqual({
			handled: true,
			cursor: { category: 0, value: 1 },
		})
	})

	it('projects a cursor onto its frame point for each orientation', () => {
		expect(cursorPoint({ category: 1, value: 0 }, TARGETS, 'vertical')).toEqual({ x: 20, y: 80 })

		expect(cursorPoint({ category: 1, value: 0 }, TARGETS, 'horizontal')).toEqual({ x: 80, y: 20 })

		expect(cursorPoint({ category: 1, value: 5 }, TARGETS, 'vertical')).toBeNull()
	})

	it('snaps an out-of-range cursor back onto the targets', () => {
		expect(clampCursor({ category: 9, value: 9 }, TARGETS)).toEqual({ category: 2, value: 1 })

		// A cursor parked on a now-empty category falls to the first focusable one.
		expect(clampCursor({ category: 1, value: 0 }, GAPPED)).toEqual({ category: 0, value: 0 })
	})
})

const DATA = [
	{ week: 'W1', a: 10, b: 90 },
	{ week: 'W2', a: 30, b: 70 },
	{ week: 'W3', a: 50, b: 50 },
]

const SERIES = [
	{ xKey: 'week', yKey: 'a', yName: 'A' },
	{ xKey: 'week', yKey: 'b', yName: 'B' },
] as const

function line(extra?: Partial<Parameters<typeof LineChart<(typeof DATA)[number]>>[0]>) {
	return <LineChart aria-label="Signups" data={DATA} series={[...SERIES]} width={400} {...extra} />
}

describe('LineChart keyboard navigation', () => {
	it('makes the plot a single arrow-navigable tab stop', () => {
		const { container } = renderUI(line())

		expect(bySlot(container, 'chart-plot')).toHaveAttribute('tabindex', '0')

		// A chart that does not navigate by category stays a plain role="img".
		const pie = renderUI(
			<PieChart
				aria-label="Share"
				data={DATA}
				series={[{ xKey: 'week', yKey: 'a' }]}
				width={400}
			/>,
		)

		expect(bySlot(pie.container, 'chart-plot')).not.toHaveAttribute('tabindex')
	})

	it('holds the readout until the first arrow, then reads the first data point', () => {
		const { container } = renderUI(line())

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		// Focus alone rings the region without seizing the readout from the pointer.
		act(() => plot.focus())

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		// The first arrow enters at the first point rather than stepping past it.
		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		const tip = bySlot(container, 'tooltip-content')

		expect(tip?.textContent).toContain('W1')

		expect(tip?.textContent).toContain('10')

		expect(tip?.textContent).toContain('90')
	})

	it('walks categories with the arrow keys and clears on Escape', () => {
		const { container } = renderUI(line())

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('W1')

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('W2')

		fireEvent.keyDown(plot, { key: 'End' })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('W3')

		fireEvent.keyDown(plot, { key: 'Escape' })

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})

	it('cycles the value crosshair through both series at a category', () => {
		const { container } = renderUI(line({ crosshair: { x: true, y: false } }))

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		// Enter at W1's first series point (a = 10).
		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		const first = bySlot(container, 'chart-crosshair-x')?.getAttribute('y1')

		// Cycling reaches the second series' point (b = 90) — a different height.
		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		const second = bySlot(container, 'chart-crosshair-x')?.getAttribute('y1')

		expect(second).not.toBe(first)

		// One more press wraps back to the first series' point.
		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		expect(bySlot(container, 'chart-crosshair-x')?.getAttribute('y1')).toBe(first)
	})

	it('keeps the readout on a category whose series share the same value', () => {
		// Both series carry identical data, so their points coincide; cycling must
		// still hold the category open rather than collapsing the two into nothing.
		const same = [
			{ week: 'W1', a: 40, b: 40 },
			{ week: 'W2', a: 80, b: 80 },
		]

		const { container } = renderUI(line({ data: same }))

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		// The second series' point sits at the same place, but the category stays put.
		const tip = bySlot(container, 'tooltip-content')

		expect(tip?.textContent).toContain('W1')

		expect(tip?.textContent).toContain('40')
	})
})
