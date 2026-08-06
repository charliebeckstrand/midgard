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

	it('reports the group id and the dot index from a click', () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			plat(<MapPoints id="fleet" label="Stops" points={STOPS} onClick={onClick} />),
		)

		fireEvent.click(allBySlot(container, 'map-points-hit')[1] as Element)

		expect(onClick).toHaveBeenCalledWith('fleet', 1)
	})

	it('reports the same pair from a right-click', () => {
		const onContextMenu = vi.fn()

		const { container } = renderUI(
			plat(<MapPoints id="fleet" label="Stops" points={STOPS} onContextMenu={onContextMenu} />),
		)

		fireEvent.contextMenu(allBySlot(container, 'map-points-hit')[2] as Element)

		expect(onContextMenu).toHaveBeenCalledWith('fleet', 2)
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

		expect(onClick).toHaveBeenCalledWith('fleet', 2)

		// The dots sit west to east, so a westward step reaches the one before it.
		fireEvent.keyDown(plot, { key: 'ArrowLeft' })

		fireEvent.keyDown(plot, { key: 'Enter' })

		expect(onClick).toHaveBeenLastCalledWith('fleet', 1)
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
})
