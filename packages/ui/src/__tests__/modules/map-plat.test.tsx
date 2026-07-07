import { describe, expect, it } from 'vitest'
import { MapPlat } from '../../modules/map'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'
import { FIXTURE_GEOJSON, FIXTURE_ROWS, FIXTURE_TOPOLOGY } from '../helpers/map-geography'

type Row = (typeof FIXTURE_ROWS)[number]

function plat(extra?: Partial<Parameters<typeof MapPlat<Row>>[0]>) {
	// The categorical base merged with arbitrary overrides can name both a
	// category and a value key, which the prop union forbids; assert the mode
	// at the spread so a test can still override any single field.
	const props = {
		'aria-label': 'Zones',
		geography: FIXTURE_GEOJSON,
		data: FIXTURE_ROWS,
		regionKey: 'state',
		categoryKey: 'zone',
		width: 400,
		...extra,
	} as Parameters<typeof MapPlat<Row>>[0]

	return <MapPlat {...props} />
}

describe('MapPlat', () => {
	it('draws one region per feature under a labelled role="img" plot', () => {
		const { container } = renderUI(plat())

		expect(allBySlot(container, 'map-region')).toHaveLength(3)

		expect(bySlot(container, 'map-plot')).toHaveAttribute('role', 'img')

		expect(bySlot(container, 'map-plot')).toHaveAttribute('aria-label', 'Zones')

		expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
	})

	it('decodes a TopoJSON topology to the same regions', () => {
		const { container } = renderUI(plat({ geography: FIXTURE_TOPOLOGY }))

		expect(allBySlot(container, 'map-region')).toHaveLength(3)
	})

	it('paints the neutral geography before the container is measured', () => {
		// No width and an unmeasured container (jsdom reports 0): the map must
		// still draw the geography from the canonical fit on the first commit —
		// the SVG appears with its region paths rather than waiting on a measure.
		const { container } = renderUI(<MapPlat aria-label="Backdrop" geography={FIXTURE_GEOJSON} />)

		const svg = container.querySelector('svg')

		expect(svg).toBeInTheDocument()

		expect(svg?.getAttribute('viewBox')).toMatch(/^0 0 \d/)

		expect(allBySlot(container, 'map-region')).toHaveLength(3)
	})

	it('reserves the frame without geography and paints it once provided', () => {
		// A lazily fetched atlas passes through as null: no guard at the call
		// site, no crash — the plot box holds the space, then the geography
		// draws in when it lands.
		const { container, rerender } = renderUI(
			<MapPlat aria-label="Backdrop" geography={null} width={400} />,
		)

		// The reserved plot box holds the space; nothing is drawn yet.
		expect(bySlot(container, 'map-plot')).toBeInTheDocument()

		expect(allBySlot(container, 'map-region')).toHaveLength(0)

		rerender(<MapPlat aria-label="Backdrop" geography={FIXTURE_GEOJSON} width={400} />)

		expect(allBySlot(container, 'map-region')).toHaveLength(3)
	})

	it('reserves the US ratio for an albers-usa plat awaiting its geography', () => {
		// Without geography the frame would fall back to 16/9 and then jump when
		// the atlas lands; albers-usa is the US, so it holds the US ratio through
		// the load — no height shift.
		const { container } = renderUI(
			<MapPlat aria-label="US" geography={null} projection="albers-usa" />,
		)

		const box = bySlot(container, 'map-plot')?.querySelector('[data-slot="aspect-ratio"]')

		expect(box).toHaveStyle({ aspectRatio: '1.709' })
	})

	it('washes colour in over solid geography under animate, never fading the paths', () => {
		const { container } = renderUI(plat({ animate: true }))

		const [alpha] = allBySlot(container, 'map-region')

		// A plain <path> carrying the colour transition — not a motion opacity
		// fade — so the geometry is legible at once and only the fill animates on.
		expect(alpha?.tagName.toLowerCase()).toBe('path')

		expect(alpha?.getAttribute('class')).toContain('transition-colors')

		expect(alpha?.getAttribute('style') ?? '').not.toContain('opacity')

		// The category colour resolves once the reveal flag flips post-mount.
		expect(alpha?.getAttribute('class')).toContain('fill-blue-600')
	})

	it('colours matched regions by category slot and leaves the rest neutral', () => {
		const { container } = renderUI(plat())

		const [alpha, beta, gamma] = allBySlot(container, 'map-region')

		// First-appearance order: East takes the first slot, West the second.
		expect(alpha?.getAttribute('class')).toContain('fill-blue-600')

		expect(beta?.getAttribute('class')).toContain('fill-orange-600')

		expect(gamma?.getAttribute('class')).toContain('fill-zinc-200')
	})

	it('honours explicit category order, colour, and label', () => {
		const { container } = renderUI(
			plat({
				categories: [{ value: 'West', label: 'Western zone', color: 'rose' }, { value: 'East' }],
			}),
		)

		const [alpha, beta] = allBySlot(container, 'map-region')

		expect(beta?.getAttribute('class')).toContain('fill-rose-600')

		// East falls to the second slot under the explicit order.
		expect(alpha?.getAttribute('class')).toContain('fill-orange-600')

		expect(allBySlot(container, 'map-legend-item').map((el) => el.textContent)).toEqual([
			'Western zone',
			'East',
		])
	})

	it('shows the legend for two categories and drops it without data', () => {
		const withData = renderUI(plat())

		expect(allBySlot(withData.container, 'map-legend-item')).toHaveLength(2)

		const bare = renderUI(<MapPlat aria-label="Backdrop" geography={FIXTURE_GEOJSON} width={400} />)

		expect(bySlot(bare.container, 'map-legend')).toBeNull()

		expect(bySlot(bare.container, 'map-legend-box')).toBeNull()

		expect(bySlot(bare.container, 'map-table')).toBeNull()
	})

	it('reserves the legend box ahead of overlay registration, and not under legend={false}', () => {
		// A child that never registers stands in for overlays whose entries land
		// late: the box must hold the space before any button exists.
		const pending = renderUI(
			<MapPlat aria-label="Backdrop" geography={FIXTURE_GEOJSON} width={400}>
				<circle r={1} />
			</MapPlat>,
		)

		expect(bySlot(pending.container, 'map-legend-box')).toBeInTheDocument()

		expect(bySlot(pending.container, 'map-legend')).toBeNull()

		const off = renderUI(plat({ legend: false }))

		expect(bySlot(off.container, 'map-legend-box')).toBeNull()
	})

	it('reserves a fixed-width column for the side panel placements', () => {
		const { container } = renderUI(plat({ legend: 'left' }))

		const box = bySlot(container, 'map-legend-box')

		expect(box?.getAttribute('class')).toContain('lg:w-48')

		// The side panel spans the reserved column beside the map from lg.
		expect(bySlot(container, 'map-legend')?.getAttribute('class')).toContain('lg:w-full')

		// Row placements reserve one item-row of height instead.
		const row = renderUI(plat({ legend: 'top' }))

		expect(bySlot(row.container, 'map-legend-box')?.getAttribute('class')).toContain('min-h-4')
	})

	it('lays the under-map legend out as a centered grid', () => {
		const { container } = renderUI(plat())

		const legend = bySlot(container, 'map-legend')

		// A centered grid block under the map.
		expect(legend?.getAttribute('class')).toContain('grid')

		expect(legend?.getAttribute('class')).toContain('mx-auto')
	})

	it('toggles a category off: neutral fill, struck legend text, pressed off', () => {
		const { container } = renderUI(plat())

		const [east] = allBySlot(container, 'map-legend-item')

		fireEvent.click(east as HTMLButtonElement)

		expect(east).toHaveAttribute('aria-pressed', 'false')

		const [alpha] = allBySlot(container, 'map-region')

		expect(alpha?.getAttribute('class')).toContain('fill-zinc-200')

		// The label is the third span — the Button's hit-target sibling and the
		// swatch lead it.
		expect(east?.querySelector('span:nth-child(3)')?.getAttribute('class')).toContain(
			'line-through',
		)
	})

	it('dims everything outside the focused legend group', () => {
		const { container } = renderUI(plat())

		const [east] = allBySlot(container, 'map-legend-item')

		fireEvent.pointerEnter(east as HTMLButtonElement)

		const groups = allBySlot(container, 'map-region').map(
			(el) => el.parentElement?.getAttribute('class') ?? '',
		)

		expect(groups[0]).not.toContain('opacity-25')

		expect(groups[1]).toContain('opacity-25')

		expect(groups[2]).toContain('opacity-25')

		fireEvent.pointerLeave(east as HTMLButtonElement)

		expect(
			allBySlot(container, 'map-region').every(
				(el) => !(el.parentElement?.getAttribute('class') ?? '').includes('opacity-25'),
			),
		).toBe(true)
	})

	it('raises the Tooltip readout over a matched region and stays silent off data', () => {
		const { container } = renderUI(plat())

		const [alpha, , gamma] = allBySlot(container, 'map-region')

		fireEvent.pointerEnter(alpha as Element, { clientX: 40, clientY: 20 })

		const tooltip = bySlot(container, 'tooltip-content')

		expect(tooltip).toBeInTheDocument()

		expect(tooltip?.textContent).toContain('Alpha')

		expect(tooltip?.textContent).toContain('East')

		// The unmatched region reads nothing — off-the-marks silence.
		fireEvent.pointerEnter(gamma as Element, { clientX: 300, clientY: 20 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		fireEvent.pointerEnter(alpha as Element, { clientX: 40, clientY: 20 })

		fireEvent.pointerLeave(bySlot(container, 'map-regions') as Element)

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})

	it('suppresses the tooltip for a toggled-off category and under tooltip={false}', () => {
		const { container } = renderUI(plat())

		const [east] = allBySlot(container, 'map-legend-item')

		fireEvent.click(east as HTMLButtonElement)

		const [alpha] = allBySlot(container, 'map-region')

		fireEvent.pointerEnter(alpha as Element, { clientX: 40, clientY: 20 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		const silent = renderUI(plat({ tooltip: false }))

		const [first] = allBySlot(silent.container, 'map-region')

		fireEvent.pointerEnter(first as Element, { clientX: 40, clientY: 20 })

		expect(bySlot(silent.container, 'tooltip-content')).toBeNull()
	})

	it('ships every region × category in the visually-hidden table', () => {
		const { container } = renderUI(plat())

		const table = bySlot(container, 'map-table')

		expect(table).toHaveClass('sr-only')

		const rows = Array.from(table?.querySelectorAll('tbody tr') ?? []).map((row) =>
			Array.from(row.querySelectorAll('th, td')).map((cell) => cell.textContent),
		)

		expect(rows).toEqual([
			['Alpha', 'East'],
			['Beta', 'West'],
			['Gamma', '—'],
		])

		expect(table?.querySelector('thead th')?.textContent).toBe('zone')
	})

	it('resolves region identity and names through the accessors', () => {
		const byName = [
			{ state: 'Alpha', zone: 'East' },
			{ state: 'Beta', zone: 'West' },
		]

		const { container } = renderUI(
			plat({
				data: byName,
				regionId: (feature) => String(feature.properties?.name),
				regionLabel: (feature) => String(feature.id),
			}),
		)

		const [alpha] = allBySlot(container, 'map-region')

		expect(alpha?.getAttribute('class')).toContain('fill-blue-600')

		const firstRow = bySlot(container, 'map-table')?.querySelector('tbody th')

		expect(firstRow?.textContent).toBe('A')
	})
})

describe('MapPlat choropleth mode', () => {
	const NUMERIC = [
		{ state: 'A', value: 0 },
		{ state: 'B', value: 50 },
		{ state: 'C', value: 100 },
	]

	// A three-stop scale, pale → deep; bins default to one per stop.
	const RANGE = ['#dbeafe', '#3b82f6', '#1e3a8a']

	const fillOf = (el?: Element) => (el as SVGPathElement | undefined)?.style.fill

	function choropleth(extra?: Partial<Parameters<typeof MapPlat<(typeof NUMERIC)[number]>>[0]>) {
		const props = {
			'aria-label': 'Density',
			geography: FIXTURE_GEOJSON,
			data: NUMERIC,
			regionKey: 'state',
			valueKey: 'value',
			colorRange: RANGE,
			valueName: 'Density',
			width: 400,
			...extra,
		} as Parameters<typeof MapPlat<(typeof NUMERIC)[number]>>[0]

		return <MapPlat {...props} />
	}

	it('fills regions with the colorRange colour for their bin, as an inline value', () => {
		const { container } = renderUI(choropleth())

		const [alpha, , gamma] = allBySlot(container, 'map-region')

		// A=0 lands in the first (pale) bin, C=100 in the last (deep) one: distinct
		// inline fills (the exact colour → bin mapping is unit-tested in map-value-scale).
		expect(fillOf(alpha)).toBeTruthy()

		expect(fillOf(gamma)).toBeTruthy()

		expect(fillOf(alpha)).not.toBe(fillOf(gamma))
	})

	it('leaves an unmatched region on the neutral no-data fill class', () => {
		const { container } = renderUI(
			choropleth({
				data: [
					{ state: 'A', value: 0 },
					{ state: 'C', value: 100 },
				],
			}),
		)

		const [, beta] = allBySlot(container, 'map-region')

		expect(beta?.getAttribute('class')).toContain('fill-zinc-200')

		expect(fillOf(beta)).toBe('')
	})

	it('shows one legend entry per bin, largest first, labelled by value range', () => {
		const { container } = renderUI(choropleth())

		const items = allBySlot(container, 'map-legend-item')

		expect(items).toHaveLength(3)

		// Descending: the top of the extent (100) leads, the bottom (0) trails.
		expect(items[0]?.textContent).toContain('100')

		expect(items.at(-1)?.textContent).toContain('0')
	})

	it('heads the data table with the value name', () => {
		const { container } = renderUI(choropleth())

		const header = bySlot(container, 'map-table')?.querySelector('thead th')

		expect(header?.textContent).toBe('Density')
	})

	it('defaults the legend to the right (aside layout)', () => {
		const { container } = renderUI(choropleth())

		// The numeric mode reads its legend beside the plot: the reserved side-panel
		// column, not the bottom row.
		expect(bySlot(container, 'map-legend-box')?.getAttribute('class')).toContain('lg:w-48')
	})

	it('paints a continuous scale bar under legend="range" instead of the switchboard', () => {
		const { container } = renderUI(choropleth({ legend: 'range' }))

		const bar = bySlot(container, 'map-range-legend')

		expect(bar).not.toBeNull()

		// The gradient bar paints the colorRange stops as an inline linear-gradient.
		expect(bySlot(container, 'map-range-track')?.getAttribute('style')).toContain('linear-gradient')

		// No discrete switchboard items in range mode.
		expect(allBySlot(container, 'map-legend-item')).toHaveLength(0)

		// The extent endpoints label the bar.
		expect(bar?.textContent).toContain('0')

		expect(bar?.textContent).toContain('100')
	})

	it('emphasises the pointed bin on range-legend hover, dimming the rest', () => {
		const { container } = renderUI(choropleth({ legend: 'range' }))

		const track = bySlot(container, 'map-range-track')

		expect(track).not.toBeNull()

		const dimmedCount = () =>
			allBySlot(container, 'map-region').filter((region) =>
				region.parentElement?.getAttribute('class')?.includes('opacity-25'),
			).length

		// Nothing dims until the bar is pointed.
		expect(dimmedCount()).toBe(0)

		fireEvent.pointerMove(track as Element, { clientY: 10 })

		// Regions outside the snapped bin dim — the switchboard's hover filter.
		expect(dimmedCount()).toBeGreaterThan(0)

		fireEvent.pointerLeave(track as Element)

		expect(dimmedCount()).toBe(0)
	})

	it('stands the range bar vertical on the right by default', () => {
		const { container } = renderUI(choropleth({ legend: 'range' }))

		const track = bySlot(container, 'map-range-track')

		expect(track?.getAttribute('aria-orientation')).toBe('vertical')

		// Low at the bottom, high at the top — the gradient runs upward.
		expect(track?.getAttribute('style')).toContain('linear-gradient(to top')
	})

	it('lays the range bar horizontal under the { type, placement } object form', () => {
		const { container } = renderUI(choropleth({ legend: { type: 'range', placement: 'bottom' } }))

		const track = bySlot(container, 'map-range-track')

		expect(track?.getAttribute('aria-orientation')).toBe('horizontal')

		// Low at the left, high at the right — the gradient runs rightward.
		expect(track?.getAttribute('style')).toContain('linear-gradient(to right')
	})

	it('drops a side range placement to a horizontal row in a box too narrow for a rail', () => {
		const { container } = renderUI(choropleth({ legend: 'range', width: 300 }))

		expect(bySlot(container, 'map-range-track')?.getAttribute('aria-orientation')).toBe(
			'horizontal',
		)
	})

	it('sheds the range bar at the spark size', () => {
		const { container } = renderUI(choropleth({ legend: 'range', width: 120 }))

		expect(bySlot(container, 'map-range-legend')).toBeNull()
	})
})

describe('MapPlat legend orientation', () => {
	it('roves vertically for a side panel and horizontally under the map', () => {
		const aside = renderUI(plat({ legend: 'left' }))

		expect(bySlot(aside.container, 'map-legend')?.getAttribute('aria-orientation')).toBe('vertical')

		const below = renderUI(plat({ legend: 'bottom' }))

		expect(bySlot(below.container, 'map-legend')?.getAttribute('aria-orientation')).toBe(
			'horizontal',
		)
	})
})
