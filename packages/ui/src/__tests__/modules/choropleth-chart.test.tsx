import { describe, expect, it, vi } from 'vitest'
import { ChoroplethChart } from '../../modules/chart'
import { formatChartValue } from '../../modules/chart/engine/chart-series'
import { allBySlot, allRegions, bySlot, fireEvent, getSlot, renderUI, screen } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

const ROWS = [
	{ region: 'A', pop: 0 },
	{ region: 'B', pop: 50 },
	{ region: 'C', pop: 100 },
]

const RANGE = ['#dbeafe', '#1e3a8a']

const fillOf = (el?: Element) => el?.getAttribute('fill')

describe('ChoroplethChart', () => {
	it('shades regions from the series colorRange, joined by idKey / colorKey', () => {
		const { container } = renderUI(
			<ChoroplethChart
				aria-label="Population"
				geography={FIXTURE_GEOJSON}
				data={ROWS}
				series={[{ idKey: 'region', colorKey: 'pop', colorRange: RANGE, colorName: 'Population' }]}
				width={400}
			/>,
		)

		const regions = allRegions(container)

		expect(regions).toHaveLength(3)

		// The scale reaches the regions as fill attributes; low and high differ.
		expect(fillOf(regions[0])).toBeTruthy()

		expect(fillOf(regions[2])).toBeTruthy()

		expect(fillOf(regions[0])).not.toBe(fillOf(regions[2]))

		// colorName → the data table's value-column header.
		expect(bySlot(container, 'map-table')?.querySelector('thead th')?.textContent).toBe(
			'Population',
		)
	})

	it('reads each region its own value in the table, not the bin range it colours in', () => {
		const { container } = renderUI(
			<ChoroplethChart
				aria-label="Population"
				geography={FIXTURE_GEOJSON}
				data={ROWS}
				series={[{ idKey: 'region', colorKey: 'pop', colorRange: RANGE, colorName: 'Population' }]}
				width={400}
			/>,
		)

		const cells = [...(bySlot(container, 'map-table')?.querySelectorAll('tbody td') ?? [])].map(
			(td) => td.textContent,
		)

		// A region reads its own total (its bin only drives the colour) — 0 / 50 / 100,
		// never the bucket range string a `format(lo)–format(hi)` bin label would emit.
		expect(cells).toEqual(expect.arrayContaining(['0', '50', '100']))

		expect(cells.some((text) => text?.includes('–'))).toBe(false)
	})

	it('defaults its legend to the right', () => {
		const { container } = renderUI(
			<ChoroplethChart
				aria-label="Population"
				geography={FIXTURE_GEOJSON}
				data={ROWS}
				series={[{ idKey: 'region', colorKey: 'pop', colorRange: RANGE }]}
				width={400}
			/>,
		)

		// Beside the plot: the reserved side-panel column.
		expect(bySlot(container, 'map-legend-box')?.getAttribute('class')).toContain('lg:w-48')
	})

	it('renders the continuous range scale bar under legend="range"', () => {
		const { container } = renderUI(
			<ChoroplethChart
				aria-label="Population"
				legend="range"
				geography={FIXTURE_GEOJSON}
				data={ROWS}
				series={[{ idKey: 'region', colorKey: 'pop', colorRange: RANGE }]}
				width={400}
			/>,
		)

		expect(bySlot(container, 'map-range-legend')).not.toBeNull()

		expect(allBySlot(container, 'map-legend-item')).toHaveLength(0)

		expect(bySlot(container, 'map-range-track')?.getAttribute('style')).toContain('linear-gradient')
	})

	it('reports a region click, with its id and feature index', () => {
		const onRegionClick = vi.fn()

		const { container } = renderUI(
			<ChoroplethChart
				aria-label="Population"
				geography={FIXTURE_GEOJSON}
				data={ROWS}
				series={[{ idKey: 'region', colorKey: 'pop', colorRange: RANGE }]}
				width={400}
				onRegionClick={onRegionClick}
			/>,
		)

		const [, beta] = allRegions(container)

		fireEvent.click(beta as Element)

		expect(onRegionClick).toHaveBeenCalledWith('B', 1)
	})

	it('draws the data-less map with no series', () => {
		const { container } = renderUI(
			<ChoroplethChart
				aria-label="Population"
				geography={FIXTURE_GEOJSON}
				data={ROWS}
				series={[]}
				width={400}
			/>,
		)

		const regions = allRegions(container)

		expect(regions).toHaveLength(3)

		// No series is no scale, so every region takes the one neutral fill.
		expect(new Set(regions.map(fillOf)).size).toBe(1)

		// And the rows do not reach the map: they carry no join key without a
		// series, so this is the union's data-less branch and it publishes no
		// table — what MapPlat itself draws for a geography with no data. The
		// props cast this call site used to carry let the rows through instead,
		// which put out a headerless table of region names against empty value
		// cells; the branch is what stops it.
		expect(bySlot(container, 'map-table')).toBeNull()

		// The plot keeps its accessible name either way.
		expect(bySlot(container, 'map-plot')?.getAttribute('aria-label')).toBe('Population')
	})
})

/** Right-clicks the choropleth's root to open its context menu. */
function openMenu(container: HTMLElement): void {
	const root = bySlot(container, 'choropleth')

	if (!root) throw new Error('no choropleth root')

	fireEvent.contextMenu(root)
}

describe('ChoroplethChart context menu', () => {
	it('offers the chart family’s default actions on a right-click', () => {
		const { container } = renderUI(
			<ChoroplethChart
				aria-label="Population"
				title="Population by region"
				geography={FIXTURE_GEOJSON}
				data={ROWS}
				series={[{ idKey: 'region', colorKey: 'pop', colorRange: RANGE, colorName: 'Population' }]}
				width={400}
			/>,
		)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()

		openMenu(container)

		// Image actions, plus the data actions the input-row readout backs.
		for (const name of [
			'Fullscreen',
			'Download PNG',
			'Download JPG',
			'Download CSV',
			'Copy data',
		]) {
			expect(screen.getByRole('menuitem', { name })).toBeInTheDocument()
		}
	})

	it('merges custom items and can hide the defaults', () => {
		const onInspect = vi.fn()

		const { container } = renderUI(
			<ChoroplethChart
				aria-label="Population"
				geography={FIXTURE_GEOJSON}
				data={ROWS}
				series={[{ idKey: 'region', colorKey: 'pop', colorRange: RANGE }]}
				width={400}
				contextMenu={{
					items: [{ key: 'inspect', label: 'Inspect', onAction: onInspect }],
					defaultItems: false,
				}}
			/>,
		)

		openMenu(container)

		expect(screen.getByRole('menuitem', { name: 'Inspect' })).toBeInTheDocument()

		expect(screen.queryByRole('menuitem', { name: 'Download CSV' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Inspect' }))

		expect(onInspect).toHaveBeenCalledOnce()
	})

	it('opens a live fullscreen copy that does not nest a second menu', () => {
		const { container } = renderUI(
			<ChoroplethChart
				aria-label="Population"
				title="Population by region"
				geography={FIXTURE_GEOJSON}
				data={ROWS}
				series={[{ idKey: 'region', colorKey: 'pop', colorRange: RANGE }]}
				width={400}
			/>,
		)

		openMenu(container)

		fireEvent.click(screen.getByRole('menuitem', { name: 'Fullscreen' }))

		const dialog = screen.getByRole('dialog')

		expect(dialog).toBeInTheDocument()

		// The re-mounted copy renders bare — its own root carries no context menu, so
		// a right-click within it opens nothing.
		const inner = dialog.querySelector<HTMLElement>('[data-slot="choropleth"]')

		expect(inner).not.toBeNull()

		if (inner) fireEvent.contextMenu(inner)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('leaves the native menu with contextMenu={false}', () => {
		const { container } = renderUI(
			<ChoroplethChart
				aria-label="Population"
				geography={FIXTURE_GEOJSON}
				data={ROWS}
				series={[{ idKey: 'region', colorKey: 'pop', colorRange: RANGE }]}
				width={400}
				contextMenu={false}
			/>,
		)

		openMenu(container)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})
})

describe('the default value format', () => {
	it('formats the table with the chart family default, the same as the CSV', () => {
		const { container } = renderUI(
			<ChoroplethChart
				aria-label="Population"
				geography={FIXTURE_GEOJSON}
				width={400}
				data={[
					{ region: 'A', pop: 1234.5 },
					{ region: 'B', pop: 50 },
					{ region: 'C', pop: 100 },
				]}
				series={[{ idKey: 'region', colorKey: 'pop', colorRange: ['#fff', '#000'] }]}
			/>,
		)

		const cells = [...(bySlot(container, 'map-table')?.querySelectorAll('tbody td') ?? [])].map(
			(cell) => cell.textContent,
		)

		expect(cells).toContain(formatChartValue(1234.5))
	})
})

describe('the range legend under quantile binning', () => {
	it('emphasises the class the host assigns the probed value to', () => {
		// Quantile binning puts the threshold at 2, so a probe at 50 falls in the
		// upper class with 2 and 100. Equal intervals over 1–100 put it with 1 and 2.
		const { container } = renderUI(
			<ChoroplethChart
				aria-label="Population"
				geography={FIXTURE_GEOJSON}
				width={400}
				legend="range"
				data={[
					{ region: 'A', pop: 1 },
					{ region: 'B', pop: 2 },
					{ region: 'C', pop: 100 },
				]}
				series={[
					{ idKey: 'region', colorKey: 'pop', colorRange: ['#fff', '#000'], binning: 'quantile' },
				]}
			/>,
		)

		const track = getSlot(container, 'map-range-track')

		track.getBoundingClientRect = () =>
			({ left: 0, top: 0, width: 20, height: 99, right: 20, bottom: 99, x: 0, y: 0 }) as DOMRect

		// Value 50 sits at (50 − 1) / 99 of the track, measured up from the bottom.
		fireEvent.pointerMove(track, { clientY: 50 })

		expect(bySlot(container, 'map-regions-lit')?.querySelectorAll('path')).toHaveLength(2)
	})
})

describe('the range legend domain under quantile binning', () => {
	it('spans the data extent, not an explicit colorDomain', () => {
		const { container } = renderUI(
			<ChoroplethChart
				aria-label="Population"
				geography={FIXTURE_GEOJSON}
				width={400}
				legend="range"
				data={[
					{ region: 'A', pop: 10 },
					{ region: 'B', pop: 15 },
					{ region: 'C', pop: 20 },
				]}
				series={[
					{
						idKey: 'region',
						colorKey: 'pop',
						colorRange: ['#fff', '#000'],
						colorDomain: [0, 100],
						binning: 'quantile',
					},
				]}
			/>,
		)

		const track = getSlot(container, 'map-range-track')

		expect(track).toHaveAttribute('aria-valuemin', '10')

		expect(track).toHaveAttribute('aria-valuemax', '20')
	})
})
