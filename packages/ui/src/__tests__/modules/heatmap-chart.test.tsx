import { describe, expect, it, vi } from 'vitest'
import { HeatmapChart, type HeatmapChartSeries } from '../../modules/chart'
import { LABEL_CHAR_WIDTH } from '../../modules/chart/engine/chart-constants'
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

/** How many cells the probe dims. */
const dimmedCount = (container: HTMLElement) =>
	cellRects(container).filter((rect) => rect.getAttribute('class')?.includes('opacity-25')).length

/**
 * A screen rect for the plot. jsdom reports a zero box, so the pointer math
 * resolves against this rect. It starts at (100, 50), so a raw client delta
 * lands on the wrong cell.
 */
const HIT_BOX = {
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

describe('HeatmapChart', () => {
	it('requires an accessible name (compile-time)', () => {
		// Never rendered; exists for `tsc`. The plot is `role="img"`, so a heatmap
		// with no `aria-label` and no `aria-labelledby` must not typecheck.
		const typeChecks = () => (
			<>
				{/* @ts-expect-error: a heatmap needs aria-label or aria-labelledby */}
				<HeatmapChart data={ROWS} series={SERIES} />

				<HeatmapChart aria-labelledby="commits-heading" data={ROWS} series={SERIES} />
			</>
		)

		expect(typeChecks).toBeTypeOf('function')
	})

	it('fills its container with no max-width cap, as the other charts do', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} />,
		)

		const root = getSlot(container, 'chart')

		expect(root).toHaveClass('w-full')

		expect(root.className).not.toMatch(/(^|\s)max-w-/)
	})

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

	it('keeps a prop that the heatmap does not take off the plot region', () => {
		const { container } = renderUI(
			<HeatmapChart
				aria-label="Commits per day"
				data={ROWS}
				series={SERIES}
				width={400}
				{...{ 'data-stray': 'leak' }}
			/>,
		)

		expect(bySlot(container, 'chart-plot')?.hasAttribute('data-stray')).toBe(false)
	})

	it('names the plot and renders the range legend by default', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits per day" data={ROWS} series={SERIES} width={400} />,
		)

		expect(bySlot(container, 'chart-plot')?.getAttribute('aria-label')).toBe('Commits per day')

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

		expect(bySlot(container, 'chart')).toHaveClass(
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

		// Nothing dims until the bar is probed.
		expect(dimmedCount(container)).toBe(0)

		// A horizontal bar reads the pointer's x, not its y — the probe still lands a
		// class and dims the cells outside it.
		fireEvent.pointerMove(track as Element, { clientX: 10 })

		expect(dimmedCount(container)).toBeGreaterThan(0)

		fireEvent.pointerLeave(track as Element)

		expect(dimmedCount(container)).toBe(0)
	})

	it('dims cells outside the probed bin on range-legend hover', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} />,
		)

		const track = bySlot(container, 'heatmap-range-track')

		expect(track).not.toBeNull()

		// Nothing dims until the bar is probed.
		expect(dimmedCount(container)).toBe(0)

		fireEvent.pointerMove(track as Element, { clientY: 10 })

		// Cells outside the probed class dim — the reciprocal of the choropleth's map filter.
		expect(dimmedCount(container)).toBeGreaterThan(0)

		fireEvent.pointerLeave(track as Element)

		expect(dimmedCount(container)).toBe(0)
	})

	it('keeps a keyboard-owned probe when the pointer leaves a focused range track', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} />,
		)

		const track = getSlot(container, 'heatmap-range-track')

		// Focus the track (keyboard ownership), then probe a class so cells dim. The
		// track reads the keyboard's ring (`:focus-visible`). The test sets that match
		// itself. jsdom guesses it from the last key press and the last element that
		// matched, and an earlier test in the worker can leave a removed element as
		// that last match.
		const matches = Element.prototype.matches

		vi.spyOn(Element.prototype, 'matches').mockImplementation(function (
			this: Element,
			selector: string,
		) {
			return selector === ':focus-visible'
				? this === document.activeElement
				: matches.call(this, selector)
		})

		act(() => track.focus())

		expect(track.matches(':focus-visible')).toBe(true)

		fireEvent.pointerMove(track, { clientY: 10 })

		expect(dimmedCount(container)).toBeGreaterThan(0)

		// A pointer passing off the bar while it holds focus must not wipe the probe
		// out from under the keyboard — the dimming and probe survive.
		fireEvent.pointerLeave(track)

		expect(dimmedCount(container)).toBeGreaterThan(0)

		// A real blur still clears it.
		fireEvent.blur(track)

		expect(dimmedCount(container)).toBe(0)
	})

	it('reserves the y gutter for proportional row labels so the widest clears the frame edge', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} />,
		)

		// The left y-axis labels are right-anchored at `plot.x - GUTTER_GAP`, so this
		// x is the widest label's right edge. jsdom has no text layout, so the width
		// is the proportional estimate. Rows are 'Mon'/'Tue' (3 chars).
		const label = container.querySelector('[data-slot="chart-axis-y"] text')

		const x = Number(label?.getAttribute('x'))

		// The widest label starts at the frame edge.
		expect(x).toBe(3 * LABEL_CHAR_WIDTH)
	})

	it('cuts a row label past the gutter with an ellipsis and keeps it whole in the table', () => {
		const long = 'Email newsletters'

		const { container } = renderUI(
			<HeatmapChart
				aria-label="Visits"
				data={[...ROWS, { day: long, hour: '9', commits: 3 }]}
				series={SERIES}
				width={400}
			/>,
		)

		const labels = [...container.querySelectorAll('[data-slot="chart-axis-y"] text')].map(
			(text) => text.textContent,
		)

		expect(labels).toEqual(['Mon', 'Tue', 'Email ne…'])

		expect(container.querySelector('table')?.textContent).toContain(long)
	})

	it('resolves the cell under the pointer, not one offset by the plot gutter', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} />,
		)

		const hit = bySlot(container, 'chart-hit')

		expect(hit).not.toBeNull()

		// jsdom reports a zero box; stand in a screen rect for the plot so the
		// fraction-across-the-rect math has something to resolve against. The rect
		// starts at (100, 50) — a raw client delta would drop that origin and land
		// on the wrong cell, the bug this guards.
		;(hit as Element).getBoundingClientRect = () => HIT_BOX

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

		const hit = bySlot(container, 'chart-hit') as Element

		// The hit layer reads as clickable.
		expect(hit.getAttribute('class')).toContain('cursor-pointer')

		// jsdom reports a zero box; stand in a screen rect so the fraction math resolves.
		;(hit as Element).getBoundingClientRect = () => HIT_BOX

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

		const hit = getSlot(container, 'chart-hit')

		hit.getBoundingClientRect = () => HIT_BOX

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

		const hit = bySlot(container, 'chart-hit')

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

		const hit = bySlot(container, 'chart-hit') as Element

		// The layer resolves a click through the rect it is drawn at, which jsdom
		// measures at zero. Give it one, as the pointer-resolution test above does.
		;(hit as Element).getBoundingClientRect = () => HIT_BOX

		// Columns are ['9', '10'] and rows ['Mon', 'Tue'], so the top-left cell is
		// Mon at hour 9 — matrix position [0, 0].
		fireEvent.click(hit, { clientX: 130, clientY: 70 })

		expect(onCellClick).toHaveBeenCalledWith({ x: '9', y: 'Mon' }, [0, 0])
	})
})

describe('HeatmapChart context menu', () => {
	it('names the right-clicked cell to a function-form menu by its row-major index', () => {
		const items = vi.fn(() => [])

		const { container } = renderUI(
			<HeatmapChart
				aria-label="Commits"
				data={ROWS}
				series={SERIES}
				width={400}
				contextMenu={{ items }}
			/>,
		)

		const hit = getSlot(container, 'chart-hit')

		hit.getBoundingClientRect = () => HIT_BOX

		// The bottom-left cell, Tue at hour 9: row 1 and column 0 of two columns.
		fireEvent.pointerMove(hit, { clientX: 130, clientY: 200 })

		fireEvent.contextMenu(hit)

		expect(items).toHaveBeenLastCalledWith({ index: 2 })
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

		const dimmed = cellRects(container).map(
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

describe('HeatmapChart keyboard navigation', () => {
	// Distinct labels and values, so each readout names one cell.
	const GRID = [
		{ day: 'Mon', hour: 'Early', commits: 11 },
		{ day: 'Mon', hour: 'Late', commits: 22 },
		{ day: 'Tue', hour: 'Early', commits: 33 },
		{ day: 'Tue', hour: 'Late', commits: 44 },
	]

	/** The open readout's text, or `null` while it is shut. */
	const readout = (container: HTMLElement) =>
		bySlot(container, 'tooltip-content')?.textContent ?? null

	it('makes the plot one tab stop whose arrows rove the cells', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={GRID} series={SERIES} width={400} />,
		)

		const plot = getSlot(container, 'chart-plot')

		expect(plot).toHaveAttribute('tabindex', '0')

		// Focus alone reads nothing. The first arrow reads the top-left cell.
		expect(readout(container)).toBeNull()

		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		expect(readout(container)).toBe('Early11Mon')

		// Left and right move along the columns, up and down along the rows.
		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(readout(container)).toBe('Late22Mon')

		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		expect(readout(container)).toBe('Late44Tue')

		fireEvent.keyDown(plot, { key: 'ArrowLeft' })

		expect(readout(container)).toBe('Early33Tue')

		fireEvent.keyDown(plot, { key: 'ArrowUp' })

		expect(readout(container)).toBe('Early11Mon')

		// Home and End jump along the row.
		fireEvent.keyDown(plot, { key: 'End' })

		expect(readout(container)).toBe('Late22Mon')

		fireEvent.keyDown(plot, { key: 'Escape' })

		expect(readout(container)).toBeNull()
	})

	it('marks the keyboard cell on the range legend', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={GRID} series={SERIES} width={400} />,
		)

		expect(bySlot(container, 'heatmap-range-arrow')).toBeNull()

		fireEvent.keyDown(getSlot(container, 'chart-plot'), { key: 'ArrowRight' })

		expect(bySlot(container, 'heatmap-range-arrow')).not.toBeNull()
	})

	it('reads a no-data cell as an em-dash', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={GRID.slice(0, 3)} series={SERIES} width={400} />,
		)

		const plot = getSlot(container, 'chart-plot')

		fireEvent.keyDown(plot, { key: 'End' })

		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		expect(readout(container)).toBe('Late—Tue')
	})

	it('keys the readout with the chart swatch, a no-data cell in a text color it can paint', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={GRID.slice(0, 3)} series={SERIES} width={400} />,
		)

		const plot = getSlot(container, 'chart-plot')

		const swatch = () => getSlot(getSlot(container, 'tooltip-content'), 'swatch')

		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		// A datum inks its cell fill inline on `currentColor`.
		expect(swatch().style.color).not.toBe('')

		fireEvent.keyDown(plot, { key: 'End' })

		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		// An HTML span paints no SVG `fill-*` class, so the no-data key takes a
		// `text-*` class on `currentColor`.
		const empty = swatch()

		expect(empty.className).not.toMatch(/\bfill-/)

		expect(empty.className).toMatch(/\btext-zinc-/)

		expect(empty.style.color).toBe('')
	})

	it('offers no tab stop without a tooltip or at the spark tier', () => {
		const off = renderUI(
			<HeatmapChart aria-label="Commits" data={GRID} series={SERIES} width={400} tooltip={false} />,
		)

		expect(getSlot(off.container, 'chart-plot')).not.toHaveAttribute('tabindex')

		const spark = renderUI(
			<HeatmapChart aria-label="Commits" data={GRID} series={SERIES} width={120} />,
		)

		expect(getSlot(spark.container, 'chart-plot')).not.toHaveAttribute('tabindex')
	})
})

describe('HeatmapChart default ratio', () => {
	/** A grid of `rows` × `cols` cells, each with a value. */
	const grid = (rows: number, cols: number) =>
		Array.from({ length: rows * cols }, (_, index) => ({
			day: `R${Math.floor(index / cols)}`,
			hour: `C${index % cols}`,
			commits: index,
		}))

	/** The height the drawing takes at 400 px wide, with no rail beside it. */
	const drawnHeight = (rows: number, cols: number) => {
		const { container } = renderUI(
			<HeatmapChart
				aria-label="Commits"
				data={grid(rows, cols)}
				series={SERIES}
				width={400}
				legend={false}
			/>,
		)

		return {
			height: Number(getSlot(container, 'chart-plot').querySelector('svg')?.getAttribute('height')),
			tier: getSlot(container, 'chart').getAttribute('data-tier'),
		}
	}

	it('fits the frame to the grid inside the bounds', () => {
		// 24 columns over 7 rows is a ratio of about 3.4, inside the bounds.
		expect(drawnHeight(7, 24).height).toBe(Math.round(400 / (24 / 7)))
	})

	it('caps a wide grid at a ratio of 4, so one row draws as a chart and not a spark strip', () => {
		const wide = drawnHeight(1, 24)

		expect(wide.height).toBe(100)

		expect(wide.tier).not.toBe('spark')
	})

	it('floors a tall grid at a ratio of 1/2', () => {
		expect(drawnHeight(24, 1).height).toBe(800)
	})

	it('keeps an explicit aspectRatio outside the bounds', () => {
		const { container } = renderUI(
			<HeatmapChart
				aria-label="Commits"
				data={grid(1, 24)}
				series={SERIES}
				width={400}
				legend={false}
				aspectRatio={8}
			/>,
		)

		expect(getSlot(container, 'chart-plot').querySelector('svg')).toHaveAttribute('height', '50')
	})
})
