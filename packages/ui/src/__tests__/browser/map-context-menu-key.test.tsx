import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { MapPlat } from '../../modules/map'
import { getSlot, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/**
 * The keyboard context menu of a map, in a real browser (WCAG 2.1.1).
 *
 * Only a browser can say where the key sends the event. The ContextMenu key and
 * Shift+F10 fire `contextmenu` at the focused plot, not at a region path, so the
 * region layer that a right-click reaches never sees it. jsdom dispatches the
 * event at the element that a test names, so it cannot show this.
 */
describe('map context menu from the keyboard', () => {
	it.for<[string, string]>([
		['Shift+F10', '{Shift>}{F10}{/Shift}'],
		['the ContextMenu key', '{ContextMenu}'],
	])('names the region under the cursor on %s', async ([, keys]) => {
		const onRegionContextMenu = vi.fn()

		renderUI(
			<MapPlat
				aria-label="Test map"
				geography={FIXTURE_GEOJSON}
				width={400}
				onRegionContextMenu={onRegionContextMenu}
			/>,
		)

		getSlot(document.body, 'map-plot').focus()

		await userEvent.keyboard('{End}')

		await userEvent.keyboard(keys)

		expect(onRegionContextMenu).toHaveBeenCalledExactlyOnceWith('C', 2)
	})
})
