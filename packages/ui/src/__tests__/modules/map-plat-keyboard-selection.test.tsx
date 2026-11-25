import { useState } from 'react'
import { describe, it } from 'vitest'
import { type MapOverlaySelection, MapPlat, MapPoint } from '../../modules/map'
import { expectAnnouncement, fireEvent } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'
import { renderNavigable } from '../helpers/map-navigable'
import { categoricalPlat } from '../helpers/map-plat'

/** A region picker that toggles the region of each pick in its selection. */
function RegionPicker({ echo = true }: { echo?: boolean }) {
	const [selected, setSelected] = useState<string[]>([])

	return categoricalPlat({
		selectedRegions: selected,
		onRegionClick: (id) => {
			if (!echo) return

			setSelected((ids) =>
				ids.includes(String(id)) ? ids.filter((held) => held !== id) : [...ids, String(id)],
			)
		},
	})
}

/** A plat with one clickable point that toggles its own selection. */
function PointPicker() {
	const [picks, setPicks] = useState<MapOverlaySelection[]>([])

	return (
		<MapPlat aria-label="Depots" geography={FIXTURE_GEOJSON} width={400} selectedOverlays={picks}>
			<MapPoint
				id="depot"
				label="Depot"
				at={[5, 5]}
				onClick={() => setPicks((held) => (held.length > 0 ? [] : [{ id: 'depot' }]))}
			/>
		</MapPlat>
	)
}

/**
 * The SVG is `aria-hidden`, so the selection ring is not in the accessible
 * output. The keyboard cursor therefore says that a stop is selected, and a
 * pick that changes the selection speaks the new state (WCAG 2.2 SC 4.1.2 and
 * SC 4.1.3).
 */
describe('MapPlat keyboard selection', () => {
	it('speaks the new state after a pick selects or clears a region', async () => {
		const { plot } = renderNavigable(<RegionPicker />)

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		await expectAnnouncement('Alpha, East')

		fireEvent.keyDown(plot, { key: 'Enter' })

		await expectAnnouncement('Alpha, East, selected')

		fireEvent.keyDown(plot, { key: 'Enter' })

		await expectAnnouncement('Alpha, East, not selected')
	})

	it('says that a region is selected on a step onto it', async () => {
		const { plot } = renderNavigable(<RegionPicker />)

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: 'Enter' })

		await expectAnnouncement('Alpha, East, selected')

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		await expectAnnouncement('Beta, West')

		fireEvent.keyDown(plot, { key: 'ArrowLeft' })

		await expectAnnouncement('Alpha, East, selected')
	})

	it('speaks no state for a pick that the caller does not echo', async () => {
		const { plot } = renderNavigable(<RegionPicker echo={false} />)

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		await expectAnnouncement('Alpha, East')

		fireEvent.keyDown(plot, { key: 'Enter' })

		// A step speaks next, so a stale pick would show here as a state.
		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		await expectAnnouncement(/^Beta, West$/)
	})

	it('speaks the new state after a pick selects an overlay mark', async () => {
		const { plot } = renderNavigable(<PointPicker />)

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		await expectAnnouncement(/^Depot$/)

		fireEvent.keyDown(plot, { key: 'Enter' })

		await expectAnnouncement('Depot, selected')

		fireEvent.keyDown(plot, { key: ' ' })

		await expectAnnouncement('Depot, not selected')
	})
})
