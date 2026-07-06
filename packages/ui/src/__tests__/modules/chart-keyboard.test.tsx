import { describe, expect, it } from 'vitest'
import { AreaChart } from '../../modules/chart/area-chart'
import { DonutChart } from '../../modules/chart/donut-chart'
import { LineChart } from '../../modules/chart/line-chart'
import { PieChart } from '../../modules/chart/pie-chart'
import {
	cartesianFocus,
	clampCursor,
	cursorPoint,
	cursorSeries,
	firstCursor,
	hasFocusTargets,
	moveCursor,
} from '../../modules/chart/use-chart-keyboard'
import { act, allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

// Category 0 carries two coincident points (a chart whose series overlap on the
// same value); the later categories separate them.
const TARGETS = cartesianFocus(
	[10, 20, 30],
	[
		[100, 100],
		[80, 60],
		[40, 40],
	],
	'vertical',
)

// A middle category with no finite value — a gap the cursor must step over.
const GAPPED = cartesianFocus([10, 20, 30], [[100], [], [40]], 'vertical')

describe('chart keyboard cursor', () => {
	it('reports whether any category is navigable', () => {
		expect(hasFocusTargets(TARGETS)).toBe(true)

		expect(hasFocusTargets({ points: [[], []] })).toBe(false)
	})

	it('opens on the first focusable category, skipping a leading gap', () => {
		expect(firstCursor(TARGETS)).toEqual({ category: 0, value: 0 })

		expect(firstCursor({ points: [[], [{ x: 20, y: 50 }]] })).toEqual({
			category: 1,
			value: 0,
		})

		expect(firstCursor({ points: [[]] })).toBeNull()
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

	it('steps the value cursor in screen order, not series order', () => {
		// Series order does not match screen order: index 0 sits at the top (y 20),
		// index 1 at the bottom (y 80), index 2 in the middle (y 50). ArrowDown must
		// descend the screen — top, middle, bottom — rather than walk the series list.
		const ranked = cartesianFocus([10], [[20, 80, 50]], 'vertical')

		expect(moveCursor({ category: 0, value: 0 }, 'ArrowDown', ranked, 'vertical').cursor).toEqual({
			category: 0,
			value: 2,
		})

		expect(moveCursor({ category: 0, value: 2 }, 'ArrowDown', ranked, 'vertical').cursor).toEqual({
			category: 0,
			value: 1,
		})

		// The bottom wraps back to the top, and ArrowUp climbs the same order.
		expect(moveCursor({ category: 0, value: 1 }, 'ArrowDown', ranked, 'vertical').cursor).toEqual({
			category: 0,
			value: 0,
		})

		expect(moveCursor({ category: 0, value: 1 }, 'ArrowUp', ranked, 'vertical').cursor).toEqual({
			category: 0,
			value: 2,
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

	it('reads the stored anchor for a cursor, null past its range', () => {
		expect(cursorPoint({ category: 1, value: 0 }, TARGETS)).toEqual({ x: 20, y: 80 })

		expect(cursorPoint({ category: 1, value: 5 }, TARGETS)).toBeNull()
	})

	it('projects value points onto the frame, transposing with orientation', () => {
		expect(cartesianFocus([10], [[40]], 'vertical').points[0]?.[0]).toEqual({ x: 10, y: 40 })

		expect(cartesianFocus([10], [[40]], 'horizontal').points[0]?.[0]).toEqual({ x: 40, y: 10 })
	})

	it('carries the series map onto the targets, and omits it when empty', () => {
		const mapped = cartesianFocus([10, 20], [[100, 50], [80]], 'vertical', undefined, [[0, 1], [1]])

		expect(mapped.series).toEqual([[0, 1], [1]])

		// No map, or an empty one, leaves the field off — a chart whose stops name no series.
		expect(cartesianFocus([10], [[40]], 'vertical').series).toBeUndefined()

		expect(cartesianFocus([10], [[40]], 'vertical', undefined, []).series).toBeUndefined()
	})

	it('resolves the series a cursor sits on, null off any', () => {
		// The map names the series behind each stop; a gap at the second category has
		// already shifted its lone stop to the surviving series' index.
		const targets = cartesianFocus([10, 20], [[100, 50], [80]], 'vertical', undefined, [
			[0, 2],
			[2],
		])

		expect(cursorSeries({ category: 0, value: 0 }, targets)).toBe(0)

		expect(cursorSeries({ category: 0, value: 1 }, targets)).toBe(2)

		expect(cursorSeries({ category: 1, value: 0 }, targets)).toBe(2)

		// A cursor parked on a reference names no series, and a stop past the map — or a
		// chart carrying none — reads null, leaving the emphasis untouched.
		expect(cursorSeries({ category: 0, value: 0, reference: 0 }, targets)).toBeNull()

		expect(cursorSeries({ category: 0, value: 9 }, targets)).toBeNull()

		expect(cursorSeries({ category: 0, value: 0 }, TARGETS)).toBeNull()
	})

	it('snaps an out-of-range cursor back onto the targets', () => {
		expect(clampCursor({ category: 9, value: 9 }, TARGETS)).toEqual({ category: 2, value: 1 })

		// A cursor parked on a now-empty category falls to the first focusable one.
		expect(clampCursor({ category: 1, value: 0 }, GAPPED)).toEqual({ category: 0, value: 0 })
	})
})

// One category, two series at y 20 and 80, and a reference line at y 50 sitting
// between them — the stop the cursor must reach along the value axis.
const REF = cartesianFocus([10], [[20, 80]], 'vertical', [50])

// Two categories carrying the same reference line, so band steps can slide along it.
const REF_SPAN = cartesianFocus(
	[10, 20],
	[
		[20, 80],
		[30, 70],
	],
	'vertical',
	[50],
)

describe('chart keyboard cursor with reference lines', () => {
	it('carries the reference positions onto the targets, and omits them without any', () => {
		expect(REF.references).toEqual([50])

		expect(cartesianFocus([10], [[20]], 'vertical').references).toBeUndefined()
	})

	it('enters at the first data point, never a reference line', () => {
		expect(firstCursor(REF)).toEqual({ category: 0, value: 0 })
	})

	it('steps onto a reference line in screen order, parking the cursor there', () => {
		// From the top series (y 20) the next stop down is the rule (y 50), not the
		// bottom series (y 80): the arrow steps the way it points, rule included.
		expect(moveCursor({ category: 0, value: 0 }, 'ArrowDown', REF, 'vertical')).toEqual({
			handled: true,
			cursor: { category: 0, value: 0, reference: 0 },
		})

		// Stepping past the rule lands on the bottom series, clearing the parking.
		expect(
			moveCursor({ category: 0, value: 0, reference: 0 }, 'ArrowDown', REF, 'vertical'),
		).toEqual({ handled: true, cursor: { category: 0, value: 1 } })

		// The reverse arrow climbs from the bottom series back onto the rule, keeping
		// the series lane it left so a later band step still has one.
		expect(moveCursor({ category: 0, value: 1 }, 'ArrowUp', REF, 'vertical')).toEqual({
			handled: true,
			cursor: { category: 0, value: 1, reference: 0 },
		})
	})

	it('reaches a reference line that coincides with a series value', () => {
		// The rule shares the series' value; the tie keeps both stops, series first,
		// so the coincident rule is still a step away rather than swallowed.
		const shared = cartesianFocus([10], [[50]], 'vertical', [50])

		expect(moveCursor({ category: 0, value: 0 }, 'ArrowDown', shared, 'vertical')).toEqual({
			handled: true,
			cursor: { category: 0, value: 0, reference: 0 },
		})
	})

	it('slides a parked reference along the band axis, keeping the series lane', () => {
		expect(
			moveCursor({ category: 0, value: 0, reference: 0 }, 'ArrowRight', REF_SPAN, 'vertical'),
		).toEqual({ handled: true, cursor: { category: 1, value: 0, reference: 0 } })
	})

	it('transposes the reference roving onto the horizontal value axis', () => {
		// Horizontal puts value on x, so the rule sits between the series along x and
		// the horizontal arrows — not the vertical ones — rove onto it.
		const horizontal = cartesianFocus([10], [[20, 80]], 'horizontal', [50])

		expect(moveCursor({ category: 0, value: 0 }, 'ArrowRight', horizontal, 'horizontal')).toEqual({
			handled: true,
			cursor: { category: 0, value: 0, reference: 0 },
		})

		// The vertical arrow steps the band instead, never touching the rule.
		expect(moveCursor({ category: 0, value: 0 }, 'ArrowDown', horizontal, 'horizontal')).toEqual({
			handled: true,
			cursor: { category: 0, value: 0 },
		})
	})

	it('drops a reference the targets no longer carry, keeping the series lane', () => {
		expect(clampCursor({ category: 0, value: 1, reference: 5 }, REF)).toEqual({
			category: 0,
			value: 1,
		})

		expect(clampCursor({ category: 0, value: 0, reference: 0 }, REF)).toEqual({
			category: 0,
			value: 0,
			reference: 0,
		})
	})

	it('reads no series anchor for a cursor parked on a reference line', () => {
		expect(cursorPoint({ category: 0, value: 0, reference: 0 }, REF)).toBeNull()

		expect(cursorPoint({ category: 0, value: 0 }, REF)).toEqual({ x: 10, y: 20 })
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

		// With no tooltip mounted there is nothing to answer the keyboard, so the
		// region stays a plain non-focusable role="img".
		const quiet = renderUI(line({ tooltip: false }))

		expect(bySlot(quiet.container, 'chart-plot')).not.toHaveAttribute('tabindex')
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

	it('drops a parked crosshair when navigation switches off without a blur', () => {
		const { container, rerender } = renderUI(line({ crosshair: { x: true, y: false } }))

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(bySlot(container, 'chart-crosshair-x')).not.toBeNull()

		// Drop the tooltip — and with it the tab stop — while focus stays in the
		// region, so no blur fires. The cursor's hover must clear rather than leaving
		// a rule stranded over now-unreadable marks.
		rerender(line({ crosshair: { x: true, y: false }, tooltip: false }))

		expect(bySlot(container, 'chart-crosshair-x')).toBeNull()
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

	it('emphasises the series the cursor reads, dimming the other marks and its tooltip row', () => {
		const { container } = renderUI(line())

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		// The first arrow enters on the first series (A); the other series (B) recedes.
		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		const marks = allBySlot(container, 'chart-line-series')

		expect(marks[0]?.getAttribute('class')).not.toContain('opacity-25')

		expect(marks[1]?.getAttribute('class')).toContain('opacity-25')

		// The tooltip dims B's row against A's, mirroring the marks.
		const rows = allBySlot(container, 'chart-tooltip-row')

		expect(rows).toHaveLength(2)

		expect(rows[0]?.getAttribute('class')).not.toContain('opacity-25')

		expect(rows[1]?.getAttribute('class')).toContain('opacity-25')

		// Cycling the value axis onto B carries the emphasis with the cursor.
		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		const stepped = allBySlot(container, 'chart-line-series')

		expect(stepped[0]?.getAttribute('class')).toContain('opacity-25')

		expect(stepped[1]?.getAttribute('class')).not.toContain('opacity-25')

		// Escape drops the emphasis with the readout — every series reads at full strength.
		fireEvent.keyDown(plot, { key: 'Escape' })

		for (const mark of allBySlot(container, 'chart-line-series')) {
			expect(mark.getAttribute('class')).not.toContain('opacity-25')
		}
	})

	it('emphasises the surviving series where a gap has shifted the stops', () => {
		// Series A has no value at W2, so W2's only stop is B; landing there must
		// emphasise B, proving the cursor's lane follows the series, not the slot.
		const gapped: { week: string; a?: number; b: number }[] = [
			{ week: 'W1', a: 10, b: 90 },
			{ week: 'W2', b: 70 },
		]

		const { container } = renderUI(
			<LineChart
				aria-label="Signups"
				data={gapped}
				series={[
					{ xKey: 'week', yKey: 'a', yName: 'A' },
					{ xKey: 'week', yKey: 'b', yName: 'B' },
				]}
				width={400}
			/>,
		)

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		// Enter at W1's series A, then step the band to W2 where only B has a stop.
		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		const marks = allBySlot(container, 'chart-line-series')

		// B (index 1) reads as active; A (index 0) recedes — the series map held its line.
		expect(marks[0]?.getAttribute('class')).toContain('opacity-25')

		expect(marks[1]?.getAttribute('class')).not.toContain('opacity-25')
	})
})

describe('AreaChart keyboard navigation', () => {
	it('makes a stacked area chart focusable and reads its stacked values', () => {
		// Stacked columns read as one whole, so the pointer tooltip floats free; the
		// keyboard still needs a stop per band, so a stacked chart stays navigable.
		const stacked = [
			{ week: 'W1', a: 40, b: 30 },
			{ week: 'W2', a: 80, b: 20 },
		]

		const { container } = renderUI(
			<AreaChart aria-label="Stacked" data={stacked} series={[...SERIES]} width={400} stacked />,
		)

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		expect(plot).toHaveAttribute('tabindex', '0')

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		const tip = bySlot(container, 'tooltip-content')

		expect(tip?.textContent).toContain('W1')

		expect(tip?.textContent).toContain('40')

		expect(tip?.textContent).toContain('30')
	})
})

const SLICES = [
	{ label: 'North', value: 40 },
	{ label: 'South', value: 30 },
	{ label: 'East', value: 20 },
]

const SLICE_SERIES = [{ xKey: 'label', yKey: 'value', yName: 'Share' }] as const

describe('PieChart and DonutChart keyboard navigation', () => {
	it('walks a pie chart through its slices with the arrow keys', () => {
		const { container } = renderUI(
			<PieChart aria-label="Share" data={SLICES} series={[...SLICE_SERIES]} width={400} />,
		)

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		expect(plot).toHaveAttribute('tabindex', '0')

		// The first arrow reads the first slice; the next steps to the following one.
		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('North')

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('South')

		fireEvent.keyDown(plot, { key: 'Escape' })

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})

	it('makes a donut chart focusable on the same slice anchors', () => {
		const { container } = renderUI(
			<DonutChart aria-label="Share" data={SLICES} series={[...SLICE_SERIES]} width={400} />,
		)

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		expect(plot).toHaveAttribute('tabindex', '0')

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('North')
	})
})
