import { describe, expect, it } from 'vitest'
import type { MapOverlaySelection } from '../../modules/map'
import { MapMarker, MapPlat, MapPoint, MapPoints, MapRoute } from '../../modules/map'
import { allBySlot, bySlot, fireEvent, renderUI, tableRows } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/** The fixture spans lon 0–30, lat 0–10; these all project inside the frame. */
const DEPOT: [number, number] = [5, 5]

const YARD: [number, number] = [25, 5]

/**
 * Two stops a fraction of a degree apart and one across the frame: over a 400px
 * frame the pair lands ~4px apart, inside the merge distance, so the set draws
 * one summary and one lone dot.
 */
const BUNCHED = [
	{ at: DEPOT, label: 'Depot' },
	{ at: [5.3, 5] as [number, number], label: 'Annex' },
	{ at: YARD, label: 'Yard' },
]

function plat(children: React.ReactNode, selectedOverlay?: MapOverlaySelection | null) {
	return (
		<MapPlat
			aria-label="Fleet"
			geography={FIXTURE_GEOJSON}
			width={400}
			selectedOverlay={selectedOverlay}
		>
			{children}
		</MapPlat>
	)
}

describe('MapPlat selected overlay', () => {
	it('haloes the picked point behind the dot it marks', () => {
		const { container, rerender } = renderUI(
			plat(<MapPoint id="depot" label="Depot" at={DEPOT} />, { id: 'depot' }),
		)

		const halo = bySlot(container, 'map-point-selected')

		// The halo traces the dot's own geometry, so the two can never sit apart.
		expect(halo?.getAttribute('d')).toBe(bySlot(container, 'map-point')?.getAttribute('d'))

		// Wider than the dot by the clear space either side, so the ink reads as a
		// band around it rather than a repaint of it.
		expect(halo?.getAttribute('stroke-width')).toBe('17')

		rerender(plat(<MapPoint id="depot" label="Depot" at={DEPOT} />, null))

		expect(bySlot(container, 'map-point-selected')).toBeNull()
	})

	it('haloes a picked route and a picked marker in their own shapes', () => {
		const route = renderUI(
			plat(<MapRoute id="leg" label="Leg" stops={[DEPOT, YARD]} />, { id: 'leg' }),
		)

		const halo = bySlot(route.container, 'map-route-selected')

		expect(halo?.getAttribute('d')).toBe(bySlot(route.container, 'map-route')?.getAttribute('d'))

		// The line's own width plus the clear space either side.
		expect(halo?.getAttribute('stroke-width')).toBe('8.5')

		// A marker is a pair of pins and the leg between them, so one pick marks all
		// three: a halo on the connector alone would leave the pins unmarked.
		const marker = renderUI(
			plat(<MapMarker id="run" label="Run" start={DEPOT} end={YARD} />, { id: 'run' }),
		)

		expect(bySlot(marker.container, 'map-marker-selected')).toBeInTheDocument()

		expect(bySlot(marker.container, 'map-marker-start-selected')?.getAttribute('d')).toBe(
			bySlot(marker.container, 'map-marker-start')?.getAttribute('d'),
		)

		expect(bySlot(marker.container, 'map-marker-end-selected')?.getAttribute('d')).toBe(
			bySlot(marker.container, 'map-marker-end')?.getAttribute('d'),
		)
	})

	it('stands the halo outside the recede and off the hit path', () => {
		const { container } = renderUI(
			plat(
				<>
					<MapPoint id="depot" label="Depot" at={DEPOT} />

					<MapRoute id="leg" label="Leg" stops={[DEPOT, YARD]} />
				</>,
				{ id: 'depot' },
			),
		)

		const halo = bySlot(container, 'map-point-selected')

		// Never a pointer target: the mark's own hit circle stays the sole one, so
		// the hover resolve can't read the same mark twice.
		expect(halo).toHaveClass('pointer-events-none')

		expect(halo).not.toHaveAttribute('data-entry-id')

		// Pointing the route dims every other mark. The picked point's halo sits
		// outside that dimmed wrapper, so a standing pick outlasts a passing hover.
		fireEvent.pointerEnter(bySlot(container, 'map-route-hit') as Element, {
			clientX: 200,
			clientY: 100,
		})

		const dimmed = bySlot(container, 'map-point')?.parentElement

		expect(dimmed?.getAttribute('class')).toContain('opacity-25')

		expect(dimmed?.contains(halo)).toBe(false)

		expect(bySlot(container, 'map-point-selected')).toBeInTheDocument()
	})

	it('haloes nothing for an id no mark registered, or a stop it does not draw', () => {
		const { container, rerender } = renderUI(
			plat(<MapPoint id="depot" label="Depot" at={DEPOT} />, { id: 'yard' }),
		)

		expect(bySlot(container, 'map-point-selected')).toBeNull()

		// A singular mark holds one stop, its own: an index past it names nothing,
		// the silence a `selectedRegion` naming no region keeps.
		rerender(plat(<MapPoint id="depot" label="Depot" at={DEPOT} />, { id: 'depot', index: 2 }))

		expect(bySlot(container, 'map-point-selected')).toBeNull()

		rerender(plat(<MapPoint id="depot" label="Depot" at={DEPOT} />, { id: 'depot' }))

		expect(bySlot(container, 'map-point-selected')).toBeInTheDocument()
	})

	it('reads the picked mark as current in the visually-hidden table', () => {
		const { container, rerender } = renderUI(
			plat(
				<>
					<MapPoint id="depot" label="Depot" at={DEPOT} detail="12 pallets" />

					<MapRoute id="leg" label="Leg" stops={[DEPOT, YARD]} detail="40 mi" />
				</>,
				{ id: 'leg' },
			),
		)

		// Value parity for the pick: assistive tech reads it off the table, never
		// off the halo alone — and exactly one row carries it.
		expect(tableRows(container)).toEqual([
			['Depot', null],
			['Leg', 'true'],
		])

		rerender(
			plat(
				<>
					<MapPoint id="depot" label="Depot" at={DEPOT} detail="12 pallets" />

					<MapRoute id="leg" label="Leg" stops={[DEPOT, YARD]} detail="40 mi" />
				</>,
				{ id: 'nowhere' },
			),
		)

		expect(tableRows(container)).toEqual([
			['Depot', null],
			['Leg', null],
		])
	})
})

describe('MapPoints selected dot', () => {
	it('haloes the dot holding the picked point, summary and all', () => {
		const { container, rerender } = renderUI(
			plat(<MapPoints id="fleet" label="Stops" points={BUNCHED} />, { id: 'fleet', index: 1 }),
		)

		const halo = bySlot(container, 'map-points-selected')

		// The pick names Annex, which the frame draws inside the summary beside
		// Depot: the halo marks the summary that holds it, graded to its width.
		expect(halo?.getAttribute('d')).toBe(bySlot(container, 'map-points-cluster')?.getAttribute('d'))

		expect(halo?.getAttribute('stroke-width')).toBe('24')

		// The lone dot across the frame takes the lone dot's own width.
		rerender(
			plat(<MapPoints id="fleet" label="Stops" points={BUNCHED} />, { id: 'fleet', index: 2 }),
		)

		expect(bySlot(container, 'map-points-selected')?.getAttribute('d')).toBe(
			bySlot(container, 'map-points-dot')?.getAttribute('d'),
		)

		expect(bySlot(container, 'map-points-selected')?.getAttribute('stroke-width')).toBe('17')
	})

	it('counts the pick in the points the caller passed, never in the drawn dots', () => {
		// Two points merge into the first drawn dot, so point 2 and dot 2 name
		// different marks — and only the caller's own numbering can name a row it
		// owns.
		const { container } = renderUI(
			plat(<MapPoints id="fleet" label="Stops" points={BUNCHED} cluster={false} />, {
				id: 'fleet',
				index: 2,
			}),
		)

		expect(bySlot(container, 'map-points-selected')?.getAttribute('d')).toBe(
			allBySlot(container, 'map-points-dot')[2]?.getAttribute('d'),
		)
	})

	it('haloes nothing for a point the set does not hold', () => {
		const { container } = renderUI(
			plat(<MapPoints id="fleet" label="Stops" points={BUNCHED} />, { id: 'fleet', index: 9 }),
		)

		expect(bySlot(container, 'map-points-selected')).toBeNull()
	})

	it('marks the table row of the dot it haloes, through the grouping it draws', () => {
		const { container } = renderUI(
			plat(<MapPoints id="fleet" label="Stops" points={BUNCHED} />, { id: 'fleet', index: 1 }),
		)

		// One row per drawn dot, and the current one is the summary the pick fell
		// into — the row the halo sits on, resolved through the one mapper both
		// surfaces read.
		expect(tableRows(container)).toEqual([
			['Stops', 'true'],
			['Yard', null],
		])
	})
})
