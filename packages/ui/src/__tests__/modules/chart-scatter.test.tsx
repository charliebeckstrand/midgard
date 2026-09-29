import { describe, expect, it, vi } from 'vitest'
import { BubbleChart } from '../../modules/chart/bubble-chart'
import {
	anchorEndTicks,
	diameterRange,
	scatterMarkAt,
	sizeDomain,
	sizeRadius,
	uniqueXValues,
} from '../../modules/chart/engine/chart-geometry/scatter'
import { nearestStopIndex } from '../../modules/chart/engine/chart-snap'
import { ScatterChart } from '../../modules/chart/scatter-chart'
import { act, allBySlot, bySlot, fireEvent, getSlot, renderUI, userEvent } from '../helpers'

type Stop = { distance: unknown; dwell: unknown; weight?: unknown }

const STOPS: Stop[] = [
	{ distance: 12, dwell: 34, weight: 4 },
	{ distance: 48, dwell: 18, weight: 16 },
	{ distance: 30, dwell: 25, weight: 9 },
]

function points(container: HTMLElement): SVGCircleElement[] {
	return [...container.querySelectorAll<SVGCircleElement>('[data-slot="chart-scatter-point"]')]
}

/** The `d` of a plain series' single discs path, where every disc is one `M` subfigure. */
function discsPath(container: HTMLElement): string {
	return bySlot(container, 'chart-scatter-discs')?.getAttribute('d') ?? ''
}

/** How many discs a plain series drew — one `M` command opens each. */
function discCount(container: HTMLElement): number {
	return discsPath(container).match(/M/g)?.length ?? 0
}

/**
 * Clicks the hit layer at a point of the drawing. jsdom lays out no box, so the
 * hit layer reads a client point as an offset from the plot origin.
 */
function clickAt(container: HTMLElement, x: number, y: number) {
	const hit = getSlot(container, 'chart-hit')

	fireEvent.click(hit, {
		clientX: x - Number(hit.getAttribute('x')),
		clientY: y - Number(hit.getAttribute('y')),
	})
}

describe('scatter geometry', () => {
	it('keys on the ascending unique x values across series', () => {
		expect(
			uniqueXValues([
				[{ x: 3, y: 1, row: 0, size: null }],
				[
					{ x: 1, y: 2, row: 0, size: null },
					{ x: 3, y: 4, row: 1, size: null },
				],
			]),
		).toEqual([1, 3])
	})

	it('resolves the disc under the pointer, the nearest center where discs overlap', () => {
		const marks = [
			[
				{ x: 10, y: 10, r: 5 },
				{ x: 40, y: 40, r: 5 },
			],
			[{ x: 12, y: 12, r: 5 }],
		]

		// On the second series' lone disc, clear of the rest.
		expect(scatterMarkAt(marks, 12, 12, 0)).toEqual({ series: 1, datum: 0 })

		// Between the two overlapping discs at (10,10) and (12,12): the nearer wins.
		expect(scatterMarkAt(marks, 10.5, 10.5, 0)).toEqual({ series: 0, datum: 0 })

		// Off every disc, past the edge slack.
		expect(scatterMarkAt(marks, 100, 100, 2)).toBeNull()
	})

	it('gives a shared point to the disc that paints on top', () => {
		// Two series share one point. The later disc draws over the earlier one, so
		// the pointer reads the disc the reader sees.
		const marks = [[{ x: 10, y: 10, r: 5 }], [{ x: 10, y: 10, r: 5 }]]

		expect(scatterMarkAt(marks, 10, 10, 0)).toEqual({ series: 1, datum: 0 })
	})

	it('folds the size extent of any count of points', () => {
		// A spread into `Math.min` throws past the engine's argument limit.
		const many = Array.from({ length: 500_000 }, (_, row) => ({
			x: row,
			y: row,
			row,
			size: row % 7 === 0 ? null : row,
		}))

		expect(sizeDomain(many)).toEqual([1, 499_999])

		expect(sizeDomain([{ x: 0, y: 0, row: 0, size: null }])).toBeNull()
	})

	it('holds the emphasized disc across the midline until a challenger decisively closes', () => {
		// Discs at (10,10) and (40,10); the midline sits at x=25.
		const marks = [
			[
				{ x: 10, y: 10, r: 5 },
				{ x: 40, y: 10, r: 5 },
			],
		]

		// Just past the midline the held disc keeps the win.
		expect(scatterMarkAt(marks, 27, 10, 100, { series: 0, datum: 0 })?.datum).toBe(0)

		// Decisively onto the other disc — under half the held distance — it flips.
		expect(scatterMarkAt(marks, 37, 10, 100, { series: 0, datum: 0 })?.datum).toBe(1)
	})

	it('resolves the nearest center however unevenly they sit', () => {
		expect(nearestStopIndex([0, 10, 100], 9)).toBe(1)

		expect(nearestStopIndex([0, 10, 100], 60)).toBe(2)

		expect(nearestStopIndex([], 5)).toBeNull()
	})

	it('scales bubble radii by area between the diameter range ends', () => {
		const diameters = diameterRange(8, 28)

		const small = sizeRadius(1, [1, 100], diameters)

		const large = sizeRadius(100, [1, 100], diameters)

		expect(small).toBeCloseTo(4)

		expect(large).toBeCloseTo(14)

		// Area-true: a quarter of the size is half the radius span, not a quarter.
		expect(sizeRadius(25, [0, 100], diameters)).toBeCloseTo(4 + (14 - 4) / 2)
	})

	it('reads equal sizes as mid-range and a sizeless point as smallest', () => {
		const diameters = diameterRange(8, 28)

		expect(sizeRadius(7, [7, 7], diameters)).toBeCloseTo(9)

		expect(sizeRadius(null, [1, 100], diameters)).toBeCloseTo(4)
	})

	it('draws a zero size at the smallest diameter and a negative size as no disc', () => {
		const diameters = diameterRange(8, 28)

		// Every size is zero, so the extent collapses. The discs still read smallest, not mid-range.
		expect(sizeRadius(0, [0, 0], diameters)).toBeCloseTo(4)

		expect(sizeRadius(-3, [0, 16], diameters)).toBe(0)
	})

	it('leaves a negative size out of the size extent', () => {
		const sized = [-5, 4, 16].map((size, row) => ({ x: row, y: row, row, size }))

		expect(sizeDomain(sized)).toEqual([4, 16])
	})

	it('anchors the edge ticks inward and leaves interior ones centered', () => {
		const anchored = anchorEndTicks(
			[
				{ at: 40, label: '0', key: 0 },
				{ at: 120, label: '50', key: 50 },
				{ at: 200, label: '100', key: 100 },
			],
			40,
			200,
		)

		expect(anchored.map((tick) => tick.anchor)).toEqual(['start', undefined, 'end'])
	})

	it('leaves a tick sitting interior to a pinned edge centered', () => {
		// A pinned floor sits at range 40, so the first tick at 60 is interior — only
		// the tick that lands on an edge reads inward.
		const anchored = anchorEndTicks(
			[
				{ at: 60, label: '-40', key: -40 },
				{ at: 200, label: '100', key: 100 },
			],
			40,
			200,
		)

		expect(anchored.map((tick) => tick.anchor)).toEqual([undefined, 'end'])
	})
})

describe('ScatterChart', () => {
	it('draws one disc per parseable row and drops junk rows, never the scale', () => {
		const ragged: Stop[] = [
			...STOPS,
			{ distance: 'twelve', dwell: 30 },
			{ distance: 61, dwell: undefined },
			{ distance: Number.NaN, dwell: 5 },
		]

		const { container } = renderUI(
			<ScatterChart
				aria-label="Dwell against distance"
				data={ragged}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
			/>,
		)

		expect(discCount(container)).toBe(3)

		// Numeric ticks line both axes.
		expect(bySlot(container, 'chart-axis-y')).not.toBeNull()

		expect(bySlot(container, 'chart-axis-x')).not.toBeNull()
	})

	it('drops a point whose y is null, and does not plot it at 0', () => {
		const { container } = renderUI(
			<ScatterChart
				aria-label="Scatter"
				data={[
					{ x: 1, y: 5 },
					{ x: 2, y: null },
					{ x: 3, y: 7 },
				]}
				series={[{ xKey: 'x', yKey: 'y' }]}
				width={400}
				height={200}
			/>,
		)

		expect(discCount(container)).toBe(2)
	})

	it('survives duplicate points and joins them in the readout', () => {
		const doubled: Stop[] = [
			{ distance: 10, dwell: 5 },
			{ distance: 10, dwell: 5 },
			{ distance: 10, dwell: 9 },
		]

		const { container } = renderUI(
			<ScatterChart
				aria-label="Duplicates"
				data={doubled}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
			/>,
		)

		expect(discCount(container)).toBe(3)

		// One unique-x column carries all three values, coincident ones included.
		expect(bySlot(container, 'chart-table')?.textContent).toContain('5, 5, 9')
	})

	it('holds up against wide magnitude ranges and a lone point', () => {
		const wide: Stop[] = [
			{ distance: 0.002, dwell: 1 },
			{ distance: 480000, dwell: 900000 },
		]

		const spread = renderUI(
			<ScatterChart
				aria-label="Wide"
				data={wide}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
			/>,
		)

		// Both discs plot on finite coordinates — a wide magnitude range never
		// leaks a `NaN` into the path that would blank the whole series.
		expect(discCount(spread.container)).toBe(2)

		expect(discsPath(spread.container)).not.toContain('NaN')

		const lone = renderUI(
			<ScatterChart
				aria-label="Lone"
				data={[{ distance: 5, dwell: 5 }]}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
			/>,
		)

		expect(discCount(lone.container)).toBe(1)

		expect(discsPath(lone.container)).not.toContain('NaN')
	})

	it('toggles a series off through the legend', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<ScatterChart
				aria-label="Two series"
				data={STOPS}
				width={480}
				series={[
					{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' },
					{ xKey: 'distance', yKey: 'weight', yName: 'Weight' },
				]}
			/>,
		)

		expect(allBySlot(container, 'chart-scatter-series')).toHaveLength(2)

		await user.click(
			container.querySelectorAll('button[data-slot="chart-legend-item"]')[1] as Element,
		)

		expect(allBySlot(container, 'chart-scatter-series')).toHaveLength(1)
	})

	it('inks a square legend swatch inline for a raw series and through the class for a slot', () => {
		const { container } = renderUI(
			<ScatterChart
				aria-label="Two series"
				data={STOPS}
				width={480}
				series={[
					{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell', color: '#e11d48' },
					{ xKey: 'distance', yKey: 'weight', yName: 'Weight', color: 'blue' },
				]}
			/>,
		)

		const swatches = [
			...(bySlot(container, 'chart-legend')?.querySelectorAll('[data-slot="swatch"]') ?? []),
		]

		const [raw, slot] = swatches

		// A disc has no stroke to mirror, so each series keys with a square.
		expect(swatches.map((swatch) => swatch.getAttribute('data-shape'))).toEqual([
			'square',
			'square',
		])

		// The raw swatch inks inline and takes no slot class; the slot swatch is the
		// other way round.
		expect(raw?.getAttribute('style')).toContain('color')

		expect(raw?.getAttribute('class') ?? '').not.toContain('text-blue-600')

		expect(slot?.getAttribute('class')).toContain('text-blue-600')

		expect(slot?.getAttribute('style')).toBeNull()
	})

	it('anchors the first and last x-axis labels inward so the corner labels stay clear', () => {
		const { container } = renderUI(
			<ScatterChart
				aria-label="Dwell against distance"
				data={STOPS}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
				axes={{ x: { format: (value: number) => `${value} mi` } }}
			/>,
		)

		const labels = [...(bySlot(container, 'chart-axis-x') as Element).querySelectorAll('text')]

		expect(labels.length).toBeGreaterThan(2)

		// The floor tick reads rightward off the value gutter, the ceiling tick
		// leftward off the frame edge, the interior ticks centered under their marks.
		expect(labels[0]).toHaveAttribute('text-anchor', 'start')

		expect(labels.at(-1)).toHaveAttribute('text-anchor', 'end')

		for (const label of labels.slice(1, -1)) {
			expect(label).toHaveAttribute('text-anchor', 'middle')
		}
	})

	it('walks the unique x columns from the keyboard, formatted per axis', () => {
		const { container } = renderUI(
			<ScatterChart
				aria-label="Dwell against distance"
				data={STOPS}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
				axes={{ x: { format: (value: number) => `${value} mi` } }}
			/>,
		)

		const plot = getSlot(container, 'chart-plot')

		act(() => plot.focus())

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		const tip = bySlot(container, 'tooltip-content')

		// The first column is the smallest x, however the rows arrived.
		expect(tip?.textContent).toContain('12 mi')

		expect(tip?.textContent).toContain('34')
	})

	it('pins the readout to a click under trigger click, ignoring hover', () => {
		const { container } = renderUI(
			<ScatterChart
				aria-label="Dwell against distance"
				data={STOPS}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
				crosshair={{ snap: true }}
				tooltip={{ trigger: 'click' }}
			/>,
		)

		const hit = bySlot(container, 'chart-hit') as Element

		// The hit layer reads as clickable.
		expect(hit.getAttribute('class')).toContain('cursor-pointer')

		// Movement no longer summons the readout under the click trigger.
		fireEvent.pointerMove(hit, { clientX: 240, clientY: 80 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		// A click pins the snapped readout, and clicking the same column clears it.
		fireEvent.click(hit, { clientX: 240, clientY: 80 })

		expect(bySlot(container, 'tooltip-content')).not.toBeNull()

		fireEvent.click(hit, { clientX: 240, clientY: 80 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})

	// A scatter point is named by a pair — the series and the datum — and not by
	// one id, so it reports its own identity rather than the `(id, index)` a map
	// region carries.
	it('mounts the hit layer for a point-click report alone', () => {
		const onPointClick = vi.fn()

		const { container } = renderUI(
			<ScatterChart
				aria-label="Dwell against distance"
				data={STOPS}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
				tooltip={false}
				onPointClick={onPointClick}
			/>,
		)

		const hit = bySlot(container, 'chart-hit')

		// No tooltip and no crosshair: the report alone is what mounted this, and
		// it points the cursor so the discs read as clickable.
		expect(hit).not.toBeNull()

		expect(hit?.getAttribute('class')).toContain('cursor-pointer')
	})

	it('reports the clicked point by series and datum', () => {
		const onPointClick = vi.fn()

		const { container } = renderUI(
			<ScatterChart
				aria-label="Dwell against distance"
				data={STOPS}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
				crosshair={{ snap: true }}
				onPointClick={onPointClick}
			/>,
		)

		fireEvent.click(bySlot(container, 'chart-hit') as Element, { clientX: 240, clientY: 80 })

		expect(onPointClick).toHaveBeenCalledWith(
			expect.objectContaining({ series: expect.any(Number), datum: expect.any(Number) }),
		)
	})

	it('reports the data row index of the clicked point, also after a row that does not parse', () => {
		/** The row that a click at the right edge of the plot reports. */
		function clickedRow(data: { x: number | string; y: number }[]) {
			const onPointClick = vi.fn()

			const { container, unmount } = renderUI(
				<ScatterChart
					aria-label="Scatter"
					data={data}
					series={[{ xKey: 'x', yKey: 'y' }]}
					width={400}
					height={200}
					crosshair={{ snap: true }}
					onPointClick={onPointClick}
				/>,
			)

			// The snapped column at the right edge is x = 20.
			fireEvent.click(getSlot(container, 'chart-hit'), { clientX: 395, clientY: 20 })

			const [{ datum }] = onPointClick.mock.calls[0] as [{ series: number; datum: number }]

			unmount()

			return data[datum]
		}

		const clean = [
			{ x: 10, y: 20 },
			{ x: 20, y: 30 },
		]

		expect(clickedRow(clean)).toEqual({ x: 20, y: 30 })

		// The first row does not parse, so the drawn point and the data row have different indices.
		expect(clickedRow([{ x: 'n/a', y: 1 }, ...clean])).toEqual({ x: 20, y: 30 })
	})

	it('dims the non-emphasized tooltip row when a legend entry is focused', () => {
		const { container } = renderUI(
			<ScatterChart
				aria-label="Two series"
				data={STOPS}
				width={480}
				series={[
					{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' },
					{ xKey: 'distance', yKey: 'weight', yName: 'Weight' },
				]}
				crosshair={{ snap: true }}
				tooltip={{ trigger: 'click' }}
			/>,
		)

		// Pin the readout, then emphasize the first series by pointing its legend
		// entry (the pointer path sets emphasis directly, unlike focus, which rides
		// `:focus-visible`).
		fireEvent.click(bySlot(container, 'chart-hit') as Element, { clientX: 240, clientY: 80 })

		const items = allBySlot(container, 'chart-legend-item') as HTMLButtonElement[]

		fireEvent.pointerEnter(items[0] as Element)

		const rows = allBySlot(container, 'chart-tooltip-row')

		expect(rows).toHaveLength(2)

		// The emphasized series' row stays lit; the other dims, mirroring the discs.
		expect(rows[0]?.getAttribute('class') ?? '').not.toContain('opacity-25')

		expect(rows[1]?.getAttribute('class') ?? '').toContain('opacity-25')
	})
})

describe('BubbleChart', () => {
	it('sizes each disc by its measure and reads it beside the value', () => {
		const { container } = renderUI(
			<BubbleChart
				aria-label="Dwell against distance, sized by weight"
				data={STOPS}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', sizeKey: 'weight', yName: 'Dwell' }]}
			/>,
		)

		const radii = points(container).map((disc) => Number(disc.getAttribute('r')))

		expect(radii).toHaveLength(3)

		// weight 4 < 9 < 16 orders the radii, clamped inside the diameter range.
		const byWeight = [radii[0], radii[2], radii[1]] as number[]

		expect(byWeight[0]).toBeLessThan(byWeight[1] as number)

		expect(byWeight[1]).toBeLessThan(byWeight[2] as number)

		expect(Math.min(...radii)).toBeGreaterThanOrEqual(4)

		expect(Math.max(...radii)).toBeLessThanOrEqual(14)

		// The data table names the size measure beside each value.
		expect(bySlot(container, 'chart-table')?.textContent).toContain('34 (weight: 4)')
	})

	it('draws no disc for a negative size and keeps the point in the data table only', () => {
		const onPointClick = vi.fn()

		const { container } = renderUI(
			<BubbleChart
				aria-label="Dwell against distance, sized by weight"
				data={[
					{ distance: 12, dwell: 34, weight: 4 },
					{ distance: 30, dwell: 25, weight: -3 },
					{ distance: 48, dwell: 18, weight: 16 },
				]}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', sizeKey: 'weight', yName: 'Dwell' }]}
				onPointClick={onPointClick}
			/>,
		)

		const discs = points(container)

		expect(discs).toHaveLength(2)

		// The data table still reads the point that draws no disc.
		expect(bySlot(container, 'chart-table')?.textContent).toContain('25 (weight: -3)')

		// Both scales are linear, so the drawn discs place the point at x 30, y 25.
		const [low, high] = discs.map((disc) => ({
			x: Number(disc.getAttribute('cx')),
			y: Number(disc.getAttribute('cy')),
		})) as [{ x: number; y: number }, { x: number; y: number }]

		const x = low.x + ((30 - 12) / (48 - 12)) * (high.x - low.x)

		const y = low.y + ((25 - 34) / (18 - 34)) * (high.y - low.y)

		clickAt(container, x, y)

		expect(onPointClick).not.toHaveBeenCalled()

		// The keyboard steps from the column at 12 to the column at 48, past the point.
		const plot = getSlot(container, 'chart-plot')

		act(() => plot.focus())

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('48')
	})

	it('reports the clicked disc by series and data row', () => {
		const onPointClick = vi.fn()

		const { container } = renderUI(
			<BubbleChart
				aria-label="Dwell against distance, sized by weight"
				data={STOPS}
				width={480}
				series={[{ xKey: 'distance', yKey: 'dwell', sizeKey: 'weight', yName: 'Dwell' }]}
				onPointClick={onPointClick}
			/>,
		)

		// The third row (distance 30) draws the third disc.
		const disc = points(container)[2] as SVGCircleElement

		clickAt(container, Number(disc.getAttribute('cx')), Number(disc.getAttribute('cy')))

		expect(onPointClick).toHaveBeenCalledWith({ series: 0, datum: 2 })
	})

	it('keeps a prop that the scatter does not take off the plot region', () => {
		// `BubbleChart` hands every prop to the scatter, and the scatter takes no
		// `texture`. The frame picks the accessible name alone for its plot region.
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { container } = renderUI(
			<BubbleChart
				aria-label="Dwell against distance, sized by weight"
				data={STOPS}
				width={480}
				// The type takes no `texture`, because a disc draws no texture tile.
				// @ts-expect-error: a JavaScript caller can still pass it.
				texture
				series={[{ xKey: 'distance', yKey: 'dwell', sizeKey: 'weight', yName: 'Dwell' }]}
				{...{ 'data-stray': 'leak' }}
			/>,
		)

		const plot = bySlot(container, 'chart-plot')

		expect(plot?.getAttribute('aria-label')).toBe('Dwell against distance, sized by weight')

		expect(plot?.hasAttribute('data-stray')).toBe(false)

		expect(error.mock.calls.flat().join(' ')).not.toContain('texture')

		error.mockRestore()
	})
})

describe('scatter axis titles', () => {
	it('draws the x and y axis titles from their axes entries', () => {
		const { container } = renderUI(
			<ScatterChart
				aria-label="Dwell against distance"
				data={STOPS}
				width={560}
				height={360}
				series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
				axes={{ x: { title: 'Distance' }, y: { title: 'Dwell' } }}
			/>,
		)

		const titles = bySlot(container, 'chart-axis-titles')

		expect(titles?.textContent).toContain('Distance')

		expect(titles?.textContent).toContain('Dwell')

		// The y title rotates along the left gutter; the x title reads flat.
		const transforms = [...(titles?.querySelectorAll('text') ?? [])].map((node) => ({
			text: node.textContent,
			transform: node.getAttribute('transform') ?? '',
		}))

		expect(transforms.find((entry) => entry.text === 'Dwell')?.transform).toContain('rotate(-90')

		expect(transforms.find((entry) => entry.text === 'Distance')?.transform).not.toContain(
			'rotate(',
		)
	})

	it('sheds the titles at the spark tier', () => {
		const { container } = renderUI(
			<ScatterChart
				aria-label="Dwell against distance"
				data={STOPS}
				width={120}
				height={40}
				series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
				axes={{ x: { title: 'Distance' } }}
			/>,
		)

		expect(bySlot(container, 'chart-axis-titles')).toBeNull()
	})
})

describe('the header reserve', () => {
	it('counts the title and subtitle against the plot, so a short titled frame reads spark', () => {
		// 200px at 16/9 is about 112px tall. The two header lines take 62px of it,
		// which leaves the plot under the 96px spark floor.
		const { container } = renderUI(
			<ScatterChart
				aria-label="Dwell against distance"
				title="Dwell"
				subtitle="By distance"
				data={STOPS}
				width={200}
				series={[{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' }]}
			/>,
		)

		expect(bySlot(container, 'chart')).toHaveAttribute('data-tier', 'spark')
	})
})
