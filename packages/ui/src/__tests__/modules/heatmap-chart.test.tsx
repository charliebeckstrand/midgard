import { describe, expect, it, vi } from 'vitest'
import { HeatmapChart, type HeatmapChartSeries } from '../../modules/chart'
import { GUTTER_EDGE_PAD, LABEL_CHAR_WIDTH } from '../../modules/chart/engine/chart-constants'
import { act, bySlot, fireEvent, getSlot, renderUI } from '../helpers'

type Row = { day: string; hour: string; commits: number }

const ROWS: Row[] = [
	{ day: 'Mon', hour: '9', commits: 1 },
	{ day: 'Mon', hour: '10', commits: 9 },
	{ day: 'Tue', hour: '9', commits: 5 },
	// (Tue, 10) omitted — a no-data cell.
]

const RANGE = ['#f7fee7', '#365314']

const SERIES = [
	{ xKey: 'hour', yKey: 'day', colorKey: 'commits', colorRange: RANGE, colorName: 'Commits' },
] satisfies [HeatmapChartSeries<Row>]

const cellRects = (container: HTMLElement) =>
	Array.from(container.querySelectorAll('[data-slot="heatmap-cells"] rect'))

describe('HeatmapChart', () => {
	it('draws one cell per grid slot, shaded from the series colorRange', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} />,
		)

		// 2 rows × 2 columns.
		const rects = cellRects(container)

		expect(rects).toHaveLength(4)

		// Finite cells carry an inline fill; the low and high values differ.
		const fills = rects.map((rect) => rect.getAttribute('fill'))

		expect(fills.filter(Boolean).length).toBe(3)

		expect(fills[0]).not.toBe(fills[1])

		// The missing (Tue, 10) pair takes the neutral no-data fill, not a scale color.
		const noData = rects.find((rect) => rect.getAttribute('fill') === null)

		expect(noData?.getAttribute('class')).toContain('fill-zinc')
	})

	it('reads a null colorKey as no data, as the choropleth reads it, not as 0', () => {
		const rows: { day: string; hour: string; commits: number | null }[] = [
			...ROWS,
			{ day: 'Tue', hour: '10', commits: null },
		]

		const { container } = renderUI(
			<HeatmapChart
				aria-label="Commits"
				data={rows}
				series={[{ xKey: 'hour', yKey: 'day', colorKey: 'commits', colorRange: RANGE }]}
				width={400}
			/>,
		)

		// The no-data cell has no fill attribute, because it takes the neutral class.
		const last = cellRects(container).at(-1)

		expect(last?.getAttribute('fill')).toBeNull()

		expect(last?.getAttribute('class')).toContain('fill-zinc')
	})

	it('separates a skewed field under quantile binning that a linear scale flattens', () => {
		// Three cells sit at the bottom of the range and one far above it. A linear
		// scale drops the low three into one bin; quantile cuts between them.
		const skewed = [
			{ day: 'Mon', hour: '9', commits: 1 },
			{ day: 'Mon', hour: '10', commits: 2 },
			{ day: 'Tue', hour: '9', commits: 3 },
			{ day: 'Tue', hour: '10', commits: 400 },
		]

		const fillsFor = (binning?: 'linear' | 'quantile') => {
			const { container } = renderUI(
				<HeatmapChart
					aria-label="Commits"
					data={skewed}
					series={[{ ...(SERIES[0] as HeatmapChartSeries<Row>), bins: 4, binning }]}
					width={400}
				/>,
			)

			return cellRects(container).map((rect) => rect.getAttribute('fill'))
		}

		expect(new Set(fillsFor('linear')).size).toBeLessThan(new Set(fillsFor('quantile')).size)
	})

	it('carries full value parity in the visually-hidden table', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} />,
		)

		const table = bySlot(container, 'chart-table')

		expect(table).not.toBeNull()

		// Row headers are the x categories; the em-dash marks the absent cell.
		expect(table?.textContent).toContain('Mon')

		expect(table?.textContent).toContain('—')
	})

	it('names the plot and renders the range legend by default', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits per day" data={ROWS} series={SERIES} width={400} />,
		)

		expect(bySlot(container, 'heatmap-plot')?.getAttribute('aria-label')).toBe('Commits per day')

		// The shared range legend paints the colorRange as an inline gradient bar.
		expect(bySlot(container, 'heatmap-range-track')?.getAttribute('style')).toContain(
			'linear-gradient',
		)
	})

	it('drops the legend when legend is false', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} legend={false} />,
		)

		expect(bySlot(container, 'heatmap-legend-box')).toBeNull()
	})

	it('selects no text in the chart, legend included', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} />,
		)

		expect(bySlot(container, 'heatmap')).toHaveClass(
			'select-none',
			'**:select-none',
			'[-webkit-touch-callout:none]',
		)
	})

	it('stands the scale bar vertical beside the plot by default', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} />,
		)

		const track = bySlot(container, 'heatmap-range-track')

		expect(track?.getAttribute('aria-orientation')).toBe('vertical')

		// Low at the bottom, high at the top — the gradient runs upward.
		expect(track?.getAttribute('style')).toContain('linear-gradient(to top')
	})

	it('lays the scale bar horizontal when placed on the bottom', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} legend="bottom" />,
		)

		const track = bySlot(container, 'heatmap-range-track')

		expect(track?.getAttribute('aria-orientation')).toBe('horizontal')

		// Low at the left, high at the right — the gradient runs rightward.
		expect(track?.getAttribute('style')).toContain('linear-gradient(to right')
	})

	it('accepts the { type, placement } object form', () => {
		const { container } = renderUI(
			<HeatmapChart
				aria-label="Commits"
				data={ROWS}
				series={SERIES}
				width={400}
				legend={{ placement: 'left' }}
			/>,
		)

		// A left placement is a side rail — vertical, like the default right.
		expect(bySlot(container, 'heatmap-range-track')?.getAttribute('aria-orientation')).toBe(
			'vertical',
		)
	})

	it('drops the scale bar at the spark tier', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={120} />,
		)

		// Under the spark width the chrome strips to bare marks — no legend.
		expect(bySlot(container, 'heatmap-legend-box')).toBeNull()
	})

	it('drops a side placement to a horizontal row in a box too narrow for a rail', () => {
		const { container } = renderUI(
			// Right is a side rail, but the box is under the compact width, so the bar
			// moves to a horizontal row under the plot the way a side legend stacks.
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={300} legend="right" />,
		)

		expect(bySlot(container, 'heatmap-range-track')?.getAttribute('aria-orientation')).toBe(
			'horizontal',
		)
	})

	it('probes a horizontal bar along its own axis, dimming cells outside the class', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} legend="bottom" />,
		)

		const track = bySlot(container, 'heatmap-range-track')

		const dimmed = () =>
			cellRects(container).filter((rect) => rect.getAttribute('class')?.includes('opacity-25'))
				.length

		// Nothing dims until the bar is probed.
		expect(dimmed()).toBe(0)

		// A horizontal bar reads the pointer's x, not its y — the probe still lands a
		// class and dims the cells outside it.
		fireEvent.pointerMove(track as Element, { clientX: 10 })

		expect(dimmed()).toBeGreaterThan(0)

		fireEvent.pointerLeave(track as Element)

		expect(dimmed()).toBe(0)
	})

	it('dims cells outside the probed bin on range-legend hover', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} />,
		)

		const track = bySlot(container, 'heatmap-range-track')

		expect(track).not.toBeNull()

		const dimmed = () =>
			cellRects(container).filter((rect) => rect.getAttribute('class')?.includes('opacity-25'))
				.length

		// Nothing dims until the bar is probed.
		expect(dimmed()).toBe(0)

		fireEvent.pointerMove(track as Element, { clientY: 10 })

		// Cells outside the probed class dim — the reciprocal of the choropleth's map filter.
		expect(dimmed()).toBeGreaterThan(0)

		fireEvent.pointerLeave(track as Element)

		expect(dimmed()).toBe(0)
	})

	it('keeps a keyboard-owned probe when the pointer leaves a focused range track', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} />,
		)

		const track = getSlot(container, 'heatmap-range-track')

		const dimmed = () =>
			cellRects(container).filter((rect) => rect.getAttribute('class')?.includes('opacity-25'))
				.length

		// Focus the track (keyboard ownership), then probe a class so cells dim.
		act(() => track.focus())

		fireEvent.pointerMove(track, { clientY: 10 })

		expect(dimmed()).toBeGreaterThan(0)

		// A pointer passing off the bar while it holds focus must not wipe the probe
		// out from under the keyboard — the dimming and probe survive.
		fireEvent.pointerLeave(track)

		expect(dimmed()).toBeGreaterThan(0)

		// A real blur still clears it.
		fireEvent.blur(track)

		expect(dimmed()).toBe(0)
	})

	it('reserves the y gutter for proportional row labels so the widest clears the frame edge', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} />,
		)

		// The left y-axis labels are right-anchored at `plot.x - GUTTER_GAP`, so this
		// x is the widest label's right edge; its left edge is x minus the estimated
		// text width. Rows are 'Mon'/'Tue' (3 chars) — capital-initial day names.
		const label = container.querySelector('[data-slot="chart-axis-y"] text')

		const x = Number(label?.getAttribute('x'))

		// Pinned to the proportional estimate: a regression to TICK_CHAR_WIDTH would
		// drop x below the label's estimated width, pushing its left edge off-frame.
		// The 3-char count rounds up to an even 4 (the gutter's magnitude-stability
		// round-up), still at the wider proportional per-glyph width.
		expect(x).toBe(Math.ceil(4 * LABEL_CHAR_WIDTH) + GUTTER_EDGE_PAD)

		expect(x).toBeGreaterThanOrEqual(3 * LABEL_CHAR_WIDTH)
	})

	it('resolves the cell under the pointer, not one offset by the plot gutter', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} />,
		)

		const hit = bySlot(container, 'heatmap-hit')

		expect(hit).not.toBeNull()

		// jsdom reports a zero box; stand in a screen rect for the plot so the
		// fraction-across-the-rect math has something to resolve against. The rect
		// starts at (100, 50) — a raw client delta would drop that origin and land
		// on the wrong cell, the bug this guards.
		const box = {
			left: 100,
			top: 50,
			right: 340,
			bottom: 210,
			width: 240,
			height: 160,
			x: 100,
			y: 50,
			toJSON: () => ({}),
		} as DOMRect

		;(hit as Element).getBoundingClientRect = () => box

		// The arrow's `top` encodes the resolved cell's bin (high value → high on the
		// bar → small top%), so it reads back which cell the pointer resolved to.
		const arrowTop = () => {
			const style = bySlot(container, 'heatmap-range-arrow')?.getAttribute('style') ?? ''

			return Number(style.match(/top:\s*([\d.]+)%/)?.[1] ?? Number.NaN)
		}

		// Columns are ['9', '10'], rows ['Mon', 'Tue']: Mon/10 = 9 (the max), Mon/9 = 1 (the min).
		// Top-right cell — the max sits high on the bar.
		fireEvent.pointerMove(hit as Element, { clientX: 330, clientY: 70 })

		const high = arrowTop()

		// Top-left cell — the min sits low on the bar.
		fireEvent.pointerMove(hit as Element, { clientX: 130, clientY: 70 })

		const low = arrowTop()

		expect(Number.isNaN(high)).toBe(false)

		expect(Number.isNaN(low)).toBe(false)

		expect(high).toBeLessThan(low)
	})

	it('pins the pointed cell on click under trigger click, ignoring hover', () => {
		const { container } = renderUI(
			<HeatmapChart
				aria-label="Commits"
				data={ROWS}
				series={SERIES}
				width={400}
				tooltip={{ trigger: 'click' }}
			/>,
		)

		const hit = bySlot(container, 'heatmap-hit') as Element

		// The hit layer reads as clickable.
		expect(hit.getAttribute('class')).toContain('cursor-pointer')

		// jsdom reports a zero box; stand in a screen rect so the fraction math resolves.
		const box = {
			left: 100,
			top: 50,
			right: 340,
			bottom: 210,
			width: 240,
			height: 160,
			x: 100,
			y: 50,
			toJSON: () => ({}),
		} as DOMRect

		;(hit as Element).getBoundingClientRect = () => box

		// Movement no longer opens the readout under the click trigger.
		fireEvent.pointerMove(hit, { clientX: 330, clientY: 70 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		// A click on the top-right cell (Mon/10 = 9) pins its readout.
		fireEvent.click(hit, { clientX: 330, clientY: 70 })

		const tooltip = bySlot(container, 'tooltip-content')

		expect(tooltip?.textContent).toContain('Mon')

		expect(tooltip?.textContent).toContain('9')

		// A second click of the same cell dismisses it.
		fireEvent.click(hit, { clientX: 330, clientY: 70 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})
	it('closes a pinned readout when its cell leaves the grid', () => {
		const full: Row[] = [...ROWS, { day: 'Tue', hour: '10', commits: 3 }]

		const pinned = (rows: Row[]) => (
			<HeatmapChart
				aria-label="Commits"
				data={rows}
				series={SERIES}
				width={400}
				tooltip={{ trigger: 'click' }}
			/>
		)

		const { container, rerender } = renderUI(pinned(full))

		const hit = getSlot(container, 'heatmap-hit')

		hit.getBoundingClientRect = () =>
			({
				left: 100,
				top: 50,
				right: 340,
				bottom: 210,
				width: 240,
				height: 160,
				x: 100,
				y: 50,
				toJSON: () => ({}),
			}) as DOMRect

		// Pin the bottom-right cell, Tue at 10.
		fireEvent.click(hit, { clientX: 330, clientY: 200 })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Tue')

		// A filter drops Tuesday and hour 10, so the grid holds one cell.
		rerender(pinned(full.slice(0, 1)))

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})

	it('paints equal values in one bin with a finite legend', () => {
		const flat = ROWS.map((row) => ({ ...row, commits: 4 }))

		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={flat} series={SERIES} width={400} />,
		)

		const fills = new Set(
			cellRects(container)
				.map((rect) => rect.getAttribute('fill'))
				.filter(Boolean),
		)

		expect(fills.size).toBe(1)

		expect(container.textContent).not.toContain('NaN')
	})
})

describe('HeatmapChart cell clicks', () => {
	// A heatmap cell is named by a pair of band labels and not by one id, so it
	// reports its own identity rather than the `(id, index)` a map region does.
	it('mounts the hit layer for a cell-click report alone', () => {
		const onCellClick = vi.fn()

		const { container } = renderUI(
			<HeatmapChart
				aria-label="Commits"
				data={ROWS}
				series={SERIES}
				width={400}
				tooltip={false}
				onCellClick={onCellClick}
			/>,
		)

		const hit = bySlot(container, 'heatmap-hit')

		expect(hit).not.toBeNull()

		expect(hit?.getAttribute('class')).toContain('cursor-pointer')
	})

	it('reports the clicked cell by its two band labels and its matrix position', () => {
		const onCellClick = vi.fn()

		const { container } = renderUI(
			<HeatmapChart
				aria-label="Commits"
				data={ROWS}
				series={SERIES}
				width={400}
				onCellClick={onCellClick}
			/>,
		)

		const hit = bySlot(container, 'heatmap-hit') as Element

		// The layer resolves a click through the rect it is drawn at, which jsdom
		// measures at zero. Give it one, as the pointer-resolution test above does.
		;(hit as Element).getBoundingClientRect = () =>
			({
				left: 100,
				top: 50,
				right: 340,
				bottom: 210,
				width: 240,
				height: 160,
				x: 100,
				y: 50,
				toJSON: () => ({}),
			}) as DOMRect

		// Columns are ['9', '10'] and rows ['Mon', 'Tue'], so the top-left cell is
		// Mon at hour 9 — matrix position [0, 0].
		fireEvent.click(hit, { clientX: 130, clientY: 70 })

		expect(onCellClick).toHaveBeenCalledWith({ x: '9', y: 'Mon' }, [0, 0])
	})
})

describe('the range legend under quantile binning', () => {
	it('emphasizes the class the host assigns the probed value to', () => {
		// Quantile binning puts the threshold at 2.5, so a probe at 3 falls in the
		// upper class with 100. Equal intervals over 1–100 would put it with 1 and 2.
		const { container } = renderUI(
			<HeatmapChart
				aria-label="Load"
				width={400}
				data={[
					{ day: 'Mon', hour: '9', n: 1 },
					{ day: 'Mon', hour: '10', n: 2 },
					{ day: 'Tue', hour: '9', n: 3 },
					{ day: 'Tue', hour: '10', n: 100 },
				]}
				series={[
					{
						xKey: 'hour',
						yKey: 'day',
						colorKey: 'n',
						colorRange: ['#fff', '#000'],
						binning: 'quantile',
					},
				]}
			/>,
		)

		const track = getSlot(container, 'heatmap-range-track')

		track.getBoundingClientRect = () =>
			({ left: 0, top: 0, width: 20, height: 99, right: 20, bottom: 99, x: 0, y: 0 }) as DOMRect

		// Value 3 sits at (3 − 1) / 99 of the track, measured up from the bottom.
		fireEvent.pointerMove(track, { clientY: 97 })

		const dimmed = [...container.querySelectorAll('[data-slot="heatmap-cells"] rect')].map(
			(cell) => cell.getAttribute('class')?.includes('opacity-25') ?? false,
		)

		expect(dimmed).toEqual([true, true, false, false])
	})
})

describe('the range legend under quantile binning, continued', () => {
	const cells = (values: number[]) =>
		values.map((n, i) => ({ day: `D${Math.floor(i / 3)}`, hour: `H${i % 3}`, n }))

	it('spans the data extent, not an explicit colorDomain', () => {
		// `colorDomain` applies to linear binning. Quantile bins cut the data, so a
		// wider domain would squeeze every class into a corner of the bar.
		const { container } = renderUI(
			<HeatmapChart
				aria-label="Load"
				width={400}
				data={cells([10, 12, 18, 20])}
				series={[
					{
						xKey: 'hour',
						yKey: 'day',
						colorKey: 'n',
						colorRange: ['#fff', '#aaa', '#555', '#000'],
						colorDomain: [0, 100],
						binning: 'quantile',
					},
				]}
			/>,
		)

		const track = getSlot(container, 'heatmap-range-track')

		expect(track).toHaveAttribute('aria-valuemin', '10')

		expect(track).toHaveAttribute('aria-valuemax', '20')
	})

	it('steps down past a class that tied thresholds leave empty', () => {
		// Thresholds [1, 5, 5]: class 2 is [5, 5] and holds nothing. ArrowDown from
		// the top class must reach the class below it, not sit at 5.
		const { container } = renderUI(
			<HeatmapChart
				aria-label="Load"
				width={400}
				data={cells([1, 1, 1, 5, 5, 5, 5, 9, 9])}
				series={[
					{
						xKey: 'hour',
						yKey: 'day',
						colorKey: 'n',
						colorRange: ['#fff', '#aaa', '#555', '#000'],
						bins: 4,
						binning: 'quantile',
					},
				]}
			/>,
		)

		const track = getSlot(container, 'heatmap-range-track')

		act(() => track.focus())

		fireEvent.keyDown(track, { key: 'End' })

		fireEvent.keyDown(track, { key: 'ArrowDown' })

		expect(track).toHaveAttribute('aria-valuetext', '1–5')
	})
})
