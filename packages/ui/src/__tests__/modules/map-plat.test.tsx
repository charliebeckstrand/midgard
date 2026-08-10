import { describe, expect, it, vi } from 'vitest'
import { MapPlat } from '../../modules/map'
import {
	REGION_FADE,
	REGION_STAGGER,
	REGION_WASH_SETTLE,
} from '../../modules/map/engine/map-motion'
import {
	allBySlot,
	allRegions,
	bySlot,
	fireEvent,
	firstRegion,
	renderUI,
	stubMatchMedia,
	tableRows,
	withFakeTime,
} from '../helpers'
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

		expect(allRegions(container)).toHaveLength(3)

		expect(bySlot(container, 'map-plot')).toHaveAttribute('role', 'img')

		expect(bySlot(container, 'map-plot')).toHaveAttribute('aria-label', 'Zones')

		expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
	})

	it('decodes a TopoJSON topology to the same regions', () => {
		const { container } = renderUI(plat({ geography: FIXTURE_TOPOLOGY }))

		expect(allRegions(container)).toHaveLength(3)
	})

	it('paints the neutral geography before the container is measured', () => {
		// No width and an unmeasured container (jsdom reports 0): the map must
		// still draw the geography from the canonical fit on the first commit —
		// the SVG appears with its region paths rather than waiting on a measure.
		const { container } = renderUI(<MapPlat aria-label="Backdrop" geography={FIXTURE_GEOJSON} />)

		const svg = container.querySelector('svg')

		expect(svg).toBeInTheDocument()

		expect(svg?.getAttribute('viewBox')).toMatch(/^0 0 \d/)

		expect(allRegions(container)).toHaveLength(3)
	})

	it('holds the paint until measured under deferPaint, the reserve still owning the box', () => {
		// deferPaint inverts the default above: an unmeasured frame (jsdom never
		// measures) mounts no SVG — the geography waits to paint once at the
		// measured aspect instead of flashing the canonical fit and refitting —
		// while the plot region still stands and reserves the space.
		const { container } = renderUI(
			<MapPlat aria-label="Tile" geography={FIXTURE_GEOJSON} deferPaint />,
		)

		expect(container.querySelector('svg')).toBeNull()

		expect(bySlot(container, 'map-plot')).toBeInTheDocument()
	})

	it('paints immediately under deferPaint when an explicit width fixes the frame', () => {
		// An explicit width is already "measured" (the SSR / test path), so there is
		// nothing to defer for: the map draws on the first commit as usual.
		const { container } = renderUI(plat({ deferPaint: true }))

		expect(allRegions(container)).toHaveLength(3)
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

		expect(allRegions(container)).toHaveLength(0)

		rerender(<MapPlat aria-label="Backdrop" geography={FIXTURE_GEOJSON} width={400} />)

		expect(allRegions(container)).toHaveLength(3)
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

		const [alpha] = allRegions(container)

		// A plain <path> carrying the colour transition — not a motion opacity
		// fade — so the geometry is legible at once and only the fill animates on.
		expect(alpha?.tagName.toLowerCase()).toBe('path')

		expect(alpha?.getAttribute('class')).toContain('transition-colors')

		expect(alpha?.getAttribute('style') ?? '').not.toContain('opacity')

		// The category colour resolves once the reveal flag flips post-mount.
		expect(alpha?.getAttribute('class')).toContain('fill-blue-600')
	})

	it('retires the reveal stagger, so a later toggle repaints without waiting one out', async () => {
		await withFakeTime(async (clock) => {
			const { container } = renderUI(plat({ animate: true }))

			const region = () => allRegions(container)[2]?.getAttribute('style') ?? ''

			// The reveal washes the geography on region by region, so each region
			// holds its own delay while it runs.
			expect(region()).toContain(`transition-delay: ${REGION_STAGGER * 2 * 1000}ms`)

			await clock.advance(REGION_WASH_SETTLE * 1000)

			// Past the reveal the stagger is gone. Left standing it delays every later
			// fill change, and on an atlas of any size nearly every region sits at the
			// cap — so a legend toggle would pay that beat before its colour so much as
			// began to move.
			expect(region()).not.toContain('transition-delay')

			// The fade itself stands; only the delay retires.
			expect(region()).toContain(`transition-duration: ${REGION_FADE.duration * 1000}ms`)
		})
	})

	it('colours matched regions by category slot and leaves the rest neutral', () => {
		const { container } = renderUI(plat())

		const [alpha, beta, gamma] = allRegions(container)

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

		const [alpha, beta] = allRegions(container)

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

		const [alpha] = allRegions(container)

		expect(alpha?.getAttribute('class')).toContain('fill-zinc-200')

		expect(bySlot(east as HTMLElement, 'map-legend-label')?.getAttribute('class')).toContain(
			'line-through',
		)
	})

	it('keeps a toggled-off category tied to its value when the data reorders', () => {
		const labelOf = (el: Element) =>
			bySlot(el as HTMLElement, 'map-legend-label')?.textContent ?? ''

		const pressedByLabel = (root: HTMLElement) =>
			Object.fromEntries(
				allBySlot(root, 'map-legend-item').map((el) => [
					labelOf(el),
					el.getAttribute('aria-pressed'),
				]),
			)

		// First-appearance order: East, then West.
		const { container, rerender } = renderUI(
			plat({
				data: [
					{ state: 'A', zone: 'East' },
					{ state: 'B', zone: 'West' },
				],
			}),
		)

		const west = allBySlot(container, 'map-legend-item').find((el) => labelOf(el) === 'West')

		fireEvent.click(west as HTMLButtonElement)

		expect(pressedByLabel(container)).toEqual({ East: 'true', West: 'false' })

		// A data update flips first-appearance order to West, then East. An
		// index-keyed toggle would now strike East — the token `category:1` moved to
		// it; the value key keeps West hidden.
		rerender(
			plat({
				data: [
					{ state: 'B', zone: 'West' },
					{ state: 'A', zone: 'East' },
				],
			}),
		)

		expect(pressedByLabel(container)).toEqual({ West: 'false', East: 'true' })
	})

	it('dims everything outside the focused legend group', () => {
		const { container } = renderUI(plat())

		const [east] = allBySlot(container, 'map-legend-item')

		fireEvent.pointerEnter(east as HTMLButtonElement)

		// The layer recedes as one group and the focused category redraws lit
		// above it — the chart marks' isolation pattern.
		expect(bySlot(container, 'map-regions-recede')?.getAttribute('class')).toContain('opacity-25')

		const lit = bySlot(container, 'map-regions-lit')

		expect(lit?.querySelectorAll('path')).toHaveLength(1)

		expect(lit?.querySelector('path')?.getAttribute('class')).toContain('fill-blue-600')

		fireEvent.pointerLeave(east as HTMLButtonElement)

		expect(bySlot(container, 'map-regions-recede')?.getAttribute('class')).not.toContain(
			'opacity-25',
		)

		expect(bySlot(container, 'map-regions-lit')).toBeNull()
	})

	it('holds the emphasis off while a toggled-on category washes back in', async () => {
		await withFakeTime(async (clock) => {
			const { container } = renderUI(plat({ animate: true }))

			const lit = () => bySlot(container, 'map-regions-lit')

			const recede = () => bySlot(container, 'map-regions-recede')?.getAttribute('class') ?? ''

			const [east] = allBySlot(container, 'map-legend-item')

			await clock.advance(REGION_WASH_SETTLE * 1000)

			// The click that toggles an entry is also what puts the pointer on it, so
			// the emphasis is live across both halves of the round trip.
			fireEvent.pointerEnter(east as HTMLButtonElement)

			fireEvent.click(east as HTMLButtonElement)

			// Hiding drops the emphasis outright — a hidden entry can't hold one — so
			// the wash out has always played in the open.
			expect(lit()).toBeNull()

			await clock.advance(REGION_FADE.duration * 1000)

			fireEvent.click(east as HTMLButtonElement)

			// The colour is restored and washing back in. The emphasis waits it out:
			// a lit copy mounted now would paint the category's landed colour over the
			// very wash bringing it there, and the reader would never see it move.
			expect(allRegions(container)[0]?.getAttribute('class')).toContain('fill-blue-600')

			expect(lit()).toBeNull()

			expect(recede()).not.toContain('opacity-25')

			await clock.advance(REGION_FADE.duration * 1000)

			// The wash has landed, so the emphasis takes over: the map dims around a
			// category that has finished arriving.
			expect(lit()?.querySelectorAll('path')).toHaveLength(1)

			expect(recede()).toContain('opacity-25')
		})
	})

	/** Toggles a category off and straight back on with the pointer held on its chip. */
	function roundTrip(container: HTMLElement) {
		const [east] = allBySlot(container, 'map-legend-item')

		fireEvent.pointerEnter(east as HTMLButtonElement)

		fireEvent.click(east as HTMLButtonElement)

		fireEvent.click(east as HTMLButtonElement)
	}

	it('emphasises a toggled-on category at once on a static map', () => {
		// `animate` is what arms the transition, so a static map paints the colour
		// outright and the hold above would be dead time.
		const { container } = renderUI(plat())

		roundTrip(container)

		expect(bySlot(container, 'map-regions-lit')?.querySelectorAll('path')).toHaveLength(1)
	})

	it('emphasises a toggled-on category at once for a reduced-motion reader', () => {
		// `motion-reduce` drops the transition, so an animated plat has no wash to
		// protect either. The preference is read live, so a session that turns it on
		// mid-flight takes it on the next toggle.
		stubMatchMedia((query) => query === '(prefers-reduced-motion: reduce)')

		const { container } = renderUI(plat({ animate: true }))

		roundTrip(container)

		expect(bySlot(container, 'map-regions-lit')?.querySelectorAll('path')).toHaveLength(1)
	})

	it('isolates the pointed region, dimming every other region', () => {
		const { container } = renderUI(plat())

		const [alpha] = allRegions(container)

		fireEvent.pointerEnter(alpha as Element, { clientX: 40, clientY: 20 })

		// The layer recedes behind the pointed region's lit copy — identical
		// geometry, so the opaque copy covers its dimmed original exactly.
		expect(bySlot(container, 'map-regions-recede')?.getAttribute('class')).toContain('opacity-25')

		const copy = bySlot(container, 'map-regions-lit')?.querySelector('path')

		expect(copy?.getAttribute('d')).toBe(alpha?.getAttribute('d'))

		expect(bySlot(container, 'map-regions-lit')?.querySelectorAll('path')).toHaveLength(1)

		fireEvent.pointerLeave(bySlot(container, 'map-regions') as Element)

		expect(bySlot(container, 'map-regions-recede')?.getAttribute('class')).not.toContain(
			'opacity-25',
		)

		expect(bySlot(container, 'map-regions-lit')).toBeNull()
	})

	it('lets the pointed region win over a still-held legend emphasis', () => {
		const { container } = renderUI(plat())

		const [east] = allBySlot(container, 'map-legend-item')

		fireEvent.pointerEnter(east as HTMLButtonElement)

		// East's region lights under the legend focus...
		expect(
			bySlot(container, 'map-regions-lit')?.querySelector('path')?.getAttribute('class'),
		).toContain('fill-blue-600')

		const [, beta] = allRegions(container)

		fireEvent.pointerEnter(beta as Element, { clientX: 150, clientY: 20 })

		// ...until pointed: the pointer's mark takes the emphasis, its copy —
		// carrying the static hover brightness — receding even the focused group.
		const copy = bySlot(container, 'map-regions-lit')?.querySelector('path')

		expect(copy?.getAttribute('class')).toContain('fill-orange-600')

		expect(copy?.getAttribute('class')).toContain('brightness-110')

		expect(bySlot(container, 'map-regions-lit')?.querySelectorAll('path')).toHaveLength(1)
	})

	it('keeps the map lit while the pointer sits on a no-data or toggled-off region', () => {
		const { container } = renderUI(plat())

		const lit = () =>
			!(bySlot(container, 'map-regions-recede')?.getAttribute('class') ?? '').includes(
				'opacity-25',
			) && bySlot(container, 'map-regions-lit') === null

		const [alpha, , gamma] = allRegions(container)

		// Gamma matches no row: the neutral fill takes no emphasis — isolating
		// nothing would read as a broken map.
		fireEvent.pointerEnter(gamma as Element, { clientX: 300, clientY: 20 })

		expect(lit()).toBe(true)

		const [east] = allBySlot(container, 'map-legend-item')

		fireEvent.click(east as HTMLButtonElement)

		// Alpha's category is toggled off, so its region reads neutral and inert.
		fireEvent.pointerEnter(alpha as Element, { clientX: 40, clientY: 20 })

		expect(lit()).toBe(true)
	})

	it('raises the Tooltip readout over a matched region and stays silent off data', () => {
		const { container } = renderUI(plat())

		const [alpha, , gamma] = allRegions(container)

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

	it('answers no pointer until something on the map can read out', () => {
		// A backdrop map — geography, no rows, no overlays — takes the pointer
		// channel away from its regions entirely, the way it already goes without
		// a tab stop and without a table. Every one of those three reads the join
		// rather than the prop that asked.
		const { container, rerender } = renderUI(
			<MapPlat aria-label="Zones" geography={FIXTURE_GEOJSON} width={400} />,
		)

		const [backdrop] = allRegions(container)

		fireEvent.pointerEnter(backdrop as Element, { clientX: 40, clientY: 20 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		// Rows landing after the mount re-arm it: the gate is a derivation of the
		// join, so the layer re-renders and the handlers arrive with the data.
		rerender(plat())

		const [matched] = allRegions(container)

		fireEvent.pointerEnter(matched as Element, { clientX: 40, clientY: 20 })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Alpha')
	})

	it('suppresses the tooltip for a toggled-off category and under tooltip={false}', () => {
		const { container } = renderUI(plat())

		const [east] = allBySlot(container, 'map-legend-item')

		fireEvent.click(east as HTMLButtonElement)

		const [alpha] = allRegions(container)

		fireEvent.pointerEnter(alpha as Element, { clientX: 40, clientY: 20 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		const silent = renderUI(plat({ tooltip: false }))

		const [first] = allRegions(silent.container)

		fireEvent.pointerEnter(first as Element, { clientX: 40, clientY: 20 })

		expect(bySlot(silent.container, 'tooltip-content')).toBeNull()
	})

	it('ships every region × category in the visually-hidden table', () => {
		const { container } = renderUI(plat())

		const table = bySlot(container, 'map-table')

		// The wrapper carries the hiding: `sr-only` sizing on the table itself
		// wouldn't collapse it (table width/height are minimums).
		expect(table?.parentElement).toHaveClass('sr-only')

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

		const [alpha] = allRegions(container)

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

	const fillOf = (el?: Element) => el?.getAttribute('fill')

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

	it('strokes region borders with a non-scaling stroke so a stale refit cannot fatten them', () => {
		const { container } = renderUI(choropleth())

		// The border rides device pixels, not viewBox units: a resize that lands the
		// refit late (box grown past the built-against frame) must not scale the
		// hairline up with the geometry.
		const region = firstRegion(container)

		expect(region?.getAttribute('vector-effect')).toBe('non-scaling-stroke')
	})

	it('fills regions with the colorRange colour for their bin, as a fill attribute', () => {
		const { container } = renderUI(choropleth())

		const [alpha, , gamma] = allRegions(container)

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

		const [, beta] = allRegions(container)

		expect(beta?.getAttribute('class')).toContain('fill-zinc-200')

		expect(fillOf(beta)).toBeNull()
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

		// The layer recedes as one group; the snapped bin's regions redraw lit.
		const receded = () =>
			(bySlot(container, 'map-regions-recede')?.getAttribute('class') ?? '').includes('opacity-25')

		// Nothing dims until the bar is pointed.
		expect(receded()).toBe(false)

		fireEvent.pointerMove(track as Element, { clientY: 10 })

		// Regions outside the snapped bin recede — the switchboard's hover filter.
		expect(receded()).toBe(true)

		expect(bySlot(container, 'map-regions-lit')?.querySelectorAll('path').length).toBeGreaterThan(0)

		fireEvent.pointerLeave(track as Element)

		expect(receded()).toBe(false)

		expect(bySlot(container, 'map-regions-lit')).toBeNull()
	})

	it('marks the hovered region at its exact value on the range bar, not its bin centre', () => {
		const { container } = renderUI(choropleth({ legend: 'range' }))

		const arrowTop = () => {
			const style = bySlot(container, 'map-range-arrow')?.getAttribute('style') ?? ''

			return Number(style.match(/top:\s*([\d.]+)%/)?.[1] ?? Number.NaN)
		}

		const [alpha, beta, gamma] = allRegions(container)

		// A = 0, the domain floor: the arrow reads the value itself — flush to the
		// bottom (100% from the top), not seated at the lowest bin's band centre.
		fireEvent.pointerEnter(alpha as Element, { clientX: 40, clientY: 20 })

		expect(arrowTop()).toBe(100)

		// B = 50 sits mid-bar; C = 100 tops it.
		fireEvent.pointerEnter(beta as Element, { clientX: 150, clientY: 20 })

		expect(arrowTop()).toBe(50)

		fireEvent.pointerEnter(gamma as Element, { clientX: 300, clientY: 20 })

		expect(arrowTop()).toBe(0)
	})

	it('stands the range bar vertical on the right by default', () => {
		const { container } = renderUI(choropleth({ legend: 'range' }))

		const track = bySlot(container, 'map-range-track')

		expect(track?.getAttribute('aria-orientation')).toBe('vertical')

		// Low at the bottom, high at the top — the gradient runs upward.
		expect(track?.getAttribute('style')).toContain('linear-gradient(to top')
	})

	it('lays the range bar horizontal under the { type, placement } object form', () => {
		const { container } = renderUI(choropleth({ legend: { placement: 'bottom' } }))

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

describe('MapPlat region click', () => {
	it('reports the clicked region by identity and feature index, matched or not', () => {
		const onRegionClick = vi.fn()

		const { container } = renderUI(plat({ onRegionClick }))

		const [, beta, gamma] = allRegions(container)

		fireEvent.click(beta as Element)

		expect(onRegionClick).toHaveBeenLastCalledWith('B', 1)

		// Gamma matches no row: an unmatched region is still a target, so selection
		// can reach a state with nothing to show rather than reading as inert.
		fireEvent.click(gamma as Element)

		expect(onRegionClick).toHaveBeenLastCalledWith('C', 2)

		expect(onRegionClick).toHaveBeenCalledTimes(2)
	})

	it('reports identity through a regionId accessor, so a click keys the caller data', () => {
		const onRegionClick = vi.fn()

		// The id a TopoJSON consumer would otherwise re-decode the topology to
		// recover — here the feature's name rather than its id.
		const { container } = renderUI(
			plat({
				geography: FIXTURE_TOPOLOGY,
				regionId: (feature) => String(feature.properties?.name),
				onRegionClick,
			}),
		)

		fireEvent.click(allRegions(container)[0] as Element)

		expect(onRegionClick).toHaveBeenCalledWith('Alpha', 0)
	})

	it('ignores a click that lands on the layer but outside every region', () => {
		const onRegionClick = vi.fn()

		const { container } = renderUI(plat({ onRegionClick }))

		// The gap between regions carries no `data-region-index` anchor. A miss must
		// report nothing — never coerce the absent attribute to region 0.
		fireEvent.click(bySlot(container, 'map-regions') as Element)

		expect(onRegionClick).not.toHaveBeenCalled()
	})

	it('takes the pointer cursor and hovers every region only when clickable', () => {
		const plain = renderUI(plat())

		expect(bySlot(plain.container, 'map-regions')?.getAttribute('class')).not.toContain(
			'cursor-pointer',
		)

		// Gamma is unmatched, so on a non-clickable layer it carries no hover emphasis.
		expect(allRegions(plain.container)[2]?.getAttribute('class')).not.toContain('hover:')

		const clickable = renderUI(plat({ onRegionClick: () => {} }))

		expect(bySlot(clickable.container, 'map-regions')?.getAttribute('class')).toContain(
			'cursor-pointer',
		)

		expect(allRegions(clickable.container)[2]?.getAttribute('class')).toContain(
			'hover:brightness-110',
		)
	})

	it('reports the right-clicked region, and nothing when the right-click misses one', () => {
		const onRegionContextMenu = vi.fn()

		const { container } = renderUI(plat({ onRegionContextMenu }))

		fireEvent.contextMenu(allRegions(container)[1] as Element)

		expect(onRegionContextMenu).toHaveBeenLastCalledWith('B', 1)

		// The gap between regions carries no `data-region-index` anchor: a wrapping
		// menu still opens, but over no region in particular.
		fireEvent.contextMenu(bySlot(container, 'map-regions') as Element)

		expect(onRegionContextMenu).toHaveBeenCalledTimes(1)
	})

	it('takes no pointer affordance for a right-click alone', () => {
		// A right-click is not advertised by a cursor — only `onRegionClick` earns
		// one, so a map that merely names its right-clicked region reads as inert.
		const { container } = renderUI(plat({ onRegionContextMenu: () => {} }))

		expect(bySlot(container, 'map-regions')?.getAttribute('class')).not.toContain('cursor-pointer')
	})

	it('leaves the plot a role="img" leaf — the click is a pointer enhancement', () => {
		const { container } = renderUI(plat({ onRegionClick: () => {} }))

		// The keyboard and assistive path is a control the consumer supplies beside
		// the map; the paths stay presentational, so nothing focusable hides in the
		// sr-only readout.
		expect(bySlot(container, 'map-plot')).toHaveAttribute('role', 'img')

		expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')

		expect(container.querySelector('[data-region-index][tabindex]')).toBeNull()
	})
})

describe('MapPlat selected region', () => {
	it('rings the selected region by the identity a click reports', () => {
		const { container, rerender } = renderUI(plat({ selectedRegion: 'B' }))

		const ring = bySlot(container, 'map-region-selected')

		// The ring traces the selected region's own geometry, so the two can never
		// name different regions.
		expect(ring?.getAttribute('d')).toBe(allRegions(container)[1]?.getAttribute('d'))

		// It marks the region rather than repainting it: the fill reads through, so
		// a selected region still shows its category colour.
		expect(ring).toHaveAttribute('fill', 'none')

		rerender(plat({ selectedRegion: 'C' }))

		expect(bySlot(container, 'map-region-selected')?.getAttribute('d')).toBe(
			allRegions(container)[2]?.getAttribute('d'),
		)
	})

	it('rings the region a regionId accessor names, not the atlas id', () => {
		const { container } = renderUI(
			plat({
				geography: FIXTURE_TOPOLOGY,
				regionId: (feature) => String(feature.properties?.name),
				selectedRegion: 'Alpha',
			}),
		)

		expect(bySlot(container, 'map-region-selected')?.getAttribute('d')).toBe(
			allRegions(container)[0]?.getAttribute('d'),
		)
	})

	it('rings nothing unset, cleared, or named by an id no region carries', () => {
		const { container, rerender } = renderUI(plat())

		expect(bySlot(container, 'map-region-selected')).toBeNull()

		// A stale id — a pick outliving the geography it was made against — must
		// ring nothing rather than falling to region 0, the miss `indexOf` reports
		// as -1.
		rerender(plat({ selectedRegion: 'Z' }))

		expect(bySlot(container, 'map-region-selected')).toBeNull()

		rerender(plat({ selectedRegion: 'A' }))

		expect(bySlot(container, 'map-region-selected')).toBeInTheDocument()

		rerender(plat({ selectedRegion: null }))

		expect(bySlot(container, 'map-region-selected')).toBeNull()
	})

	it('stands the ring above the layer, outside the recede and off the hit path', () => {
		const { container } = renderUI(plat({ selectedRegion: 'B' }))

		const ring = bySlot(container, 'map-region-selected')

		// Outside the recede group, so a pointed mark elsewhere dims the region
		// under the ring but never the ring: a standing pick outlasts a passing
		// hover.
		expect(bySlot(container, 'map-regions-recede')?.contains(ring)).toBe(false)

		expect(ring).toHaveClass('pointer-events-none')

		// No region anchor on the copy: the base path stays the sole hit target, so
		// the hover resolve never reads the same region twice.
		expect(ring).not.toHaveAttribute('data-region-index')

		expect(allRegions(container)).toHaveLength(3)
	})

	it('takes no pointer affordance from a selection alone', () => {
		// A map showing a pick made elsewhere — a Select, a route parameter — is a
		// readout, not a picker: without `onRegionClick` there is no click to
		// promise.
		const { container } = renderUI(plat({ selectedRegion: 'B' }))

		expect(bySlot(container, 'map-regions')?.getAttribute('class')).not.toContain('cursor-pointer')
	})

	it('reads the selected region as current in the visually-hidden table', () => {
		const { container, rerender } = renderUI(plat({ selectedRegion: 'B' }))

		// Value parity for the pick: assistive tech reads the selection off the
		// table, never off the ring alone.
		expect(tableRows(container)).toEqual([
			['Alpha', null],
			['Beta', 'true'],
			['Gamma', null],
		])

		rerender(plat({ selectedRegion: null }))

		expect(tableRows(container)).toEqual([
			['Alpha', null],
			['Beta', null],
			['Gamma', null],
		])
	})
})

describe('MapPlat controlled emphasis', () => {
	it('dims every group outside a controlled emphasis, with no legend of its own', () => {
		// One legend outside several plats drives them all through this prop, so the
		// emphasis has to land without the plat's own legend being involved.
		const { container } = renderUI(plat({ legend: false, emphasis: 'category:East' }))

		expect(bySlot(container, 'map-legend')).toBeNull()

		expect(bySlot(container, 'map-regions-recede')?.getAttribute('class')).toContain('opacity-25')

		// Alpha is the East region: its lit copy holds at full strength above the
		// receded layer.
		const lit = bySlot(container, 'map-regions-lit')

		expect(lit?.querySelectorAll('path')).toHaveLength(1)

		expect(lit?.querySelector('path')?.getAttribute('d')).toBe(
			allRegions(container)[0]?.getAttribute('d'),
		)
	})

	it('treats a controlled null as "no emphasis", not as uncontrolled', () => {
		const { container } = renderUI(plat({ legend: false, emphasis: null }))

		expect(bySlot(container, 'map-regions-recede')?.getAttribute('class')).not.toContain(
			'opacity-25',
		)

		expect(bySlot(container, 'map-regions-lit')).toBeNull()
	})

	it('ignores an emphasis naming a group this plat has no marks for', () => {
		// Sharing one legend across plats means an id can arrive that this plat's data
		// never produced; dimming the whole map against nothing would read as broken.
		const { container } = renderUI(plat({ legend: false, emphasis: 'category:Nowhere' }))

		expect(bySlot(container, 'map-regions-recede')?.getAttribute('class')).not.toContain(
			'opacity-25',
		)
	})

	it('lets its own legend drive the emphasis when the prop is omitted', () => {
		const { container } = renderUI(plat())

		const [east] = allBySlot(container, 'map-legend-item')

		fireEvent.pointerEnter(east as HTMLButtonElement)

		expect(bySlot(container, 'map-regions-recede')?.getAttribute('class')).toContain('opacity-25')
	})
})
