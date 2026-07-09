import { describe, expect, it, vi } from 'vitest'
import { ChoroplethChart } from '../../modules/chart'
import { allBySlot, bySlot, fireEvent, renderUI, screen } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

const ROWS = [
	{ region: 'A', pop: 0 },
	{ region: 'B', pop: 50 },
	{ region: 'C', pop: 100 },
]

const RANGE = ['#dbeafe', '#1e3a8a']

const fillOf = (el?: Element) => (el as SVGPathElement | undefined)?.style.fill

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

		const regions = allBySlot(container, 'map-region')

		expect(regions).toHaveLength(3)

		// The scale reaches the regions as inline fill values; low and high differ.
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
					items: [{ key: 'inspect', label: 'Inspect', onSelect: onInspect }],
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
