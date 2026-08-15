import { describe, expect, it, vi } from 'vitest'
import { MapPlat, MapPoint, MapPoints } from '../../modules/map'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/** The fixture spans lon 0–30, lat 0–10, so these project inside the frame. */
const DEPOT: [number, number] = [5, 5]

const YARD: [number, number] = [15, 5]

const SITE: [number, number] = [25, 5]

/** A named dot, a named dot with no detail, and an unnamed one. */
const STOPS = [
	{ at: DEPOT, label: 'Depot', detail: '12 pallets' },
	{ at: YARD, label: 'Yard' },
	{ at: SITE },
]

/**
 * Two stops a fraction of a degree apart and one across the frame. The fixture
 * spans 30° over a 400px frame, so the pair lands ~4px apart — inside the merge
 * distance — and the third stands 260px clear of them.
 */
const BUNCHED = [
	{ at: DEPOT, label: 'Depot', detail: '12 pallets' },
	{ at: [5.3, 5] as [number, number], label: 'Annex' },
	{ at: SITE, label: 'Site' },
]

function plat(children: React.ReactNode) {
	return (
		<MapPlat aria-label="Fleet" geography={FIXTURE_GEOJSON} width={400}>
			{children}
		</MapPlat>
	)
}

/** Gives the plot's SVG a real box, so a keyboard cursor can place its readout. */
function boxed(container: HTMLElement) {
	const svg = container.querySelector('svg')

	if (svg === null) throw new Error('the plat drew no SVG')

	vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
		left: 0,
		top: 0,
		width: 400,
		height: 200,
		right: 400,
		bottom: 200,
		x: 0,
		y: 0,
		toJSON: () => ({}),
	})
}

describe('MapPoints', () => {
	it('draws every dot under a single legend entry', () => {
		const { container } = renderUI(plat(<MapPoints id="fleet" label="Stops" points={STOPS} />))

		expect(allBySlot(container, 'map-points-dot')).toHaveLength(3)

		expect(allBySlot(container, 'map-legend-item')).toHaveLength(1)

		expect(bySlot(container, 'map-legend-item')?.textContent).toContain('Stops')
	})

	it('registers once where a MapPoint each would register per dot', () => {
		// The whole point of the plural mark: one ledger write, one sort, one row,
		// one palette slot, however many dots.
		const singular = renderUI(
			plat(
				<>
					<MapPoint id="a" label="A" at={DEPOT} />

					<MapPoint id="b" label="B" at={YARD} />

					<MapPoint id="c" label="C" at={SITE} />
				</>,
			),
		)

		expect(allBySlot(singular.container, 'map-legend-item')).toHaveLength(3)

		const plural = renderUI(plat(<MapPoints id="fleet" label="Stops" points={STOPS} />))

		expect(allBySlot(plural.container, 'map-legend-item')).toHaveLength(1)
	})

	it('reads each dot out by its own name, falling back to the group', () => {
		const { container } = renderUI(plat(<MapPoints id="fleet" label="Stops" points={STOPS} />))

		const hits = allBySlot(container, 'map-points-hit')

		fireEvent.pointerEnter(hits[0] as Element, { clientX: 10, clientY: 10 })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Depot')

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('12 pallets')

		// A dot that names itself but carries no detail shows none — the group's
		// would describe the set, not the dot.
		fireEvent.pointerEnter(hits[1] as Element, { clientX: 20, clientY: 10 })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Yard')

		// A dot with no name of its own reads the group's.
		fireEvent.pointerEnter(hits[2] as Element, { clientX: 30, clientY: 10 })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Stops')
	})

	it('reports the group id, the dot index, and the stops the dot draws for', () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			plat(<MapPoints id="fleet" label="Stops" points={STOPS} onClick={onClick} />),
		)

		fireEvent.click(allBySlot(container, 'map-points-hit')[1] as Element)

		// An unmerged dot stands for itself alone, so the pick and the group agree.
		expect(onClick).toHaveBeenCalledWith('fleet', 1, [1])
	})

	it('reports the same arguments from a right-click', () => {
		const onContextMenu = vi.fn()

		const { container } = renderUI(
			plat(<MapPoints id="fleet" label="Stops" points={STOPS} onContextMenu={onContextMenu} />),
		)

		fireEvent.contextMenu(allBySlot(container, 'map-points-hit')[2] as Element)

		expect(onContextMenu).toHaveBeenCalledWith('fleet', 2, [2])
	})

	it('walks the dots one at a time with the keyboard and picks the one it stands on', () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			plat(<MapPoints id="fleet" label="Stops" points={STOPS} onClick={onClick} />),
		)

		boxed(container)

		const plot = bySlot(container, 'map-plot') as Element

		// End lands on the last dot, since the regions lead the stop list.
		fireEvent.keyDown(plot, { key: 'End' })

		fireEvent.keyDown(plot, { key: 'Enter' })

		expect(onClick).toHaveBeenCalledWith('fleet', 2, [2])

		// The dots sit west to east, so a westward step reaches the one before it.
		fireEvent.keyDown(plot, { key: 'ArrowLeft' })

		fireEvent.keyDown(plot, { key: 'Enter' })

		expect(onClick).toHaveBeenLastCalledWith('fleet', 1, [1])
	})

	it('lights the whole group when the pointer is on one dot', () => {
		// The group is the mark: pointing one dot must not dim the rest of itself,
		// which is what lets 200 dots draw under one wrapper and one dim class.
		const { container } = renderUI(
			plat(
				<>
					<MapPoints id="fleet" label="Stops" points={STOPS} />

					<MapPoint id="far" label="Far" at={[28, 8]} />
				</>,
			),
		)

		fireEvent.pointerEnter(allBySlot(container, 'map-points-hit')[0] as Element, {
			clientX: 10,
			clientY: 10,
		})

		const group = bySlot(container, 'map-points')

		expect(group?.getAttribute('class') ?? '').not.toContain('opacity-25')

		expect(allBySlot(container, 'map-points-dot')).toHaveLength(3)
	})

	it("draws a lone dot in its own colour and a summary in the mark's", () => {
		const coloured = [
			{ at: DEPOT, label: 'Depot', color: 'green' as const },
			{ at: [5.3, 5] as [number, number], label: 'Annex', color: 'red' as const },
			{ at: SITE, label: 'Site', color: 'amber' as const },
		]

		const { container } = renderUI(plat(<MapPoints id="fleet" label="Stops" points={coloured} />))

		// The far stop stands alone, so it wears the colour it was given.
		const lone = allBySlot(container, 'map-points-dot')[0]

		expect(lone?.getAttribute('class') ?? '').toContain('stroke-amber-600')

		// The merged pair stands for two colours at once, so it keeps the mark's
		// own slot rather than either of theirs.
		const summary = allBySlot(container, 'map-points-cluster')[0]

		const summaryClass = summary?.getAttribute('class') ?? ''

		expect(summaryClass).not.toContain('stroke-green')

		expect(summaryClass).not.toContain('stroke-red')
	})

	it('draws nothing at all when the legend toggles it off', () => {
		const { container } = renderUI(plat(<MapPoints id="fleet" label="Stops" points={STOPS} />))

		fireEvent.click(bySlot(container, 'map-legend-item') as Element)

		expect(allBySlot(container, 'map-points-dot')).toHaveLength(0)
	})

	it('gives the hidden table a row per dot, not one for the set', () => {
		// The table is the parity surface: a reader must get the same per-dot
		// readout the pointer gets from the tooltip, not one row named for the
		// group. An unnamed dot is numbered within it, since a reader has no
		// position to tell two unnamed dots apart by.
		const { container } = renderUI(plat(<MapPoints id="fleet" label="Stops" points={STOPS} />))

		const rows = container.querySelectorAll('table tbody tr')

		const text = [...rows].map((row) => row.textContent ?? '')

		expect(text.some((row) => row.includes('Depot') && row.includes('12 pallets'))).toBe(true)

		expect(text.some((row) => row.includes('Yard'))).toBe(true)

		expect(text.some((row) => row.includes('Stops 3'))).toBe(true)
	})

	it('renders nothing for an empty set but keeps its legend row', () => {
		const { container } = renderUI(plat(<MapPoints id="fleet" label="Stops" points={[]} />))

		expect(allBySlot(container, 'map-points-dot')).toHaveLength(0)

		expect(allBySlot(container, 'map-legend-item')).toHaveLength(1)
	})

	it('summarises the dots the frame draws on top of one another', () => {
		const { container } = renderUI(plat(<MapPoints id="fleet" label="Stops" points={BUNCHED} />))

		// The pair reads as one graded mark carrying its count; the far dot keeps
		// drawing as itself.
		expect(allBySlot(container, 'map-points-cluster')).toHaveLength(1)

		expect(allBySlot(container, 'map-points-dot')).toHaveLength(1)

		expect(bySlot(container, 'map-points-count')?.textContent).toBe('2')
	})

	it('draws every dot where the grouping is off', () => {
		const { container } = renderUI(
			plat(<MapPoints id="fleet" label="Stops" points={BUNCHED} cluster={false} />),
		)

		expect(allBySlot(container, 'map-points-dot')).toHaveLength(3)

		expect(allBySlot(container, 'map-points-cluster')).toHaveLength(0)
	})

	it('reports the first stop a summary holds, and every stop under it', () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			plat(<MapPoints id="fleet" label="Stops" points={BUNCHED} onClick={onClick} />),
		)

		fireEvent.click(allBySlot(container, 'map-points-hit')[0] as Element)

		// The pick names a real point, and the group beside it names every stop the
		// one dot the reader pressed was standing for.
		expect(onClick).toHaveBeenCalledWith('fleet', 0, [0, 1])

		// The far dot still reports its own index, though a group ahead of it holds
		// two stops — the caller counts in points, never in groups.
		fireEvent.click(allBySlot(container, 'map-points-hit')[1] as Element)

		expect(onClick).toHaveBeenLastCalledWith('fleet', 2, [2])
	})

	it('reads a summary out as the group, by the count and the spread it holds', () => {
		const { container } = renderUI(
			plat(
				<MapPoints
					id="fleet"
					label="Stops"
					points={BUNCHED}
					clusterDetail={(count, span) => `${count} stops across ${Math.round(span / 1000)} km`}
				/>,
			),
		)

		fireEvent.pointerEnter(allBySlot(container, 'map-points-hit')[0] as Element, {
			clientX: 10,
			clientY: 10,
		})

		const readout = bySlot(container, 'tooltip-content')?.textContent ?? ''

		// The set's name, never one member's: no one stop of a summary names it.
		expect(readout).toContain('Stops')

		expect(readout).not.toContain('Depot')

		expect(readout).toContain('2 stops across 33 km')
	})

	it('gives the hidden table the summary the map draws, not the dots inside it', () => {
		// The table and the tooltip read one resolver, so what a reader gets is
		// what the pointer gets: the mark that is on the map.
		const { container } = renderUI(plat(<MapPoints id="fleet" label="Stops" points={BUNCHED} />))

		const text = [...container.querySelectorAll('table tbody tr')].map(
			(row) => row.textContent ?? '',
		)

		expect(text.some((row) => row.includes('Stops') && row.includes('2'))).toBe(true)

		expect(text.some((row) => row.includes('Site'))).toBe(true)
	})
})

describe('a summary names the stops it merged', () => {
	it('hands clusterDetail the merged stops own labels', () => {
		const seen: string[][] = []

		renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
				<MapPoints
					label="Codes"
					points={[
						{ at: [15, 5], label: '77002' },
						{ at: [15.05, 5.05], label: '84101' },
					]}
					clusterDetail={(_count, _span, labels) => {
						seen.push(labels)

						return labels.join(', ')
					}}
				/>
			</MapPlat>,
		)

		// A summary is one mark downstream — one tooltip, one row — so a reader who sees a `2` can only
		// learn WHICH two from here. Before this the callback got a count and a span and nothing else.
		expect(seen.some((labels) => labels.join(', ') === '77002, 84101')).toBe(true)
	})

	it('falls back to a stops position where it has no label of its own', () => {
		const seen: string[][] = []

		renderUI(
			<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
				<MapPoints
					label="Stops"
					points={[{ at: [15, 5] }, { at: [15.05, 5.05] }]}
					clusterDetail={(_count, _span, labels) => {
						seen.push(labels)

						return ''
					}}
				/>
			</MapPlat>,
		)

		// The same fallback a lone dot's tooltip takes, so a stop reads identically merged or not.
		expect(seen.some((labels) => labels.join(', ') === 'Stops 1, Stops 2')).toBe(true)
	})
})
