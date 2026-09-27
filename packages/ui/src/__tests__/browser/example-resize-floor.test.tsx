import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Example } from '../../docs/engine/components/example'
import { MapGeofence, MapPlat } from '../../modules/map'
import { getSlot, renderUI, waitFor } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/**
 * The docs frame's resize handle stops where its content stops shrinking. The
 * floor is the content's measured `min-content` width, not a number a demo
 * passes. For a map that is the map's `min-w-48` (192px), plus the section's
 * padding and the frame's border. Intrinsic sizes need a layout engine, so this
 * rides the real browser.
 */
describe('Example resize floor (real browser)', () => {
	beforeAll(() => page.viewport(1280, 800))

	function mapExample() {
		return renderUI(
			<Example width={720} resize>
				<MapPlat aria-label="Zones" geography={FIXTURE_GEOJSON} legend="right">
					{['North', 'South', 'East'].map((name, index) => (
						<MapGeofence key={name} label={name} at={[8 + index * 3, 5]} radius={300_000} />
					))}
				</MapPlat>
			</Example>,
		)
	}

	it('stops the handle at the map’s minimum width, with nothing clipped', async () => {
		const { container } = mapExample()

		const handle = getSlot(container, 'example-resize-handle')

		const frame = getSlot(container, 'example-frame')

		const map = getSlot(container, 'map')

		handle.focus()

		// Far more than the 720px start: every nudge past the floor must hold at it.
		for (let press = 0; press < 20; press++) await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')

		// 192px map, 2 × 16px section padding, 2 × 1px frame border.
		await waitFor(() => expect(frame.getBoundingClientRect().width).toBe(226))

		expect(handle).toHaveAttribute('aria-valuemin', '226')

		expect(map.getBoundingClientRect().width).toBe(192)

		expect(map.getBoundingClientRect().right).toBeLessThanOrEqual(
			frame.getBoundingClientRect().right,
		)
	})

	it('jumps to the measured floor on Home', async () => {
		const { container } = mapExample()

		const handle = getSlot(container, 'example-resize-handle')

		handle.focus()

		await userEvent.keyboard('{Home}')

		await waitFor(() =>
			expect(getSlot(container, 'example-frame').getBoundingClientRect().width).toBe(226),
		)
	})
})
