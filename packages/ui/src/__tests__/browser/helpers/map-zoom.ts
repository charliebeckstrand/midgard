import { MAP_ZOOM_MAX, MAP_ZOOM_STEP } from '../../../modules/map/engine/map-constants'
import { fireEvent } from '../../helpers'

/**
 * Driving a map plat's zoom from the keyboard, for the browser suites that
 * assert what a view holds across its whole range.
 *
 * Browser-local rather than in the shared `__tests__/helpers` barrel: only a
 * real engine resolves the geometry these sweeps read, so nothing in the jsdom
 * suites presses `+` to the ceiling.
 */

/**
 * How many `+` presses reach the zoom ceiling, derived rather than counted, so a
 * softer step or a higher ceiling still sweeps the whole range a case claims.
 */
export const CEILING_PRESSES = Math.ceil(Math.log(MAP_ZOOM_MAX) / Math.log(MAP_ZOOM_STEP))

/**
 * Zooms a plat from its fit to its ceiling, one `+` at a time.
 *
 * `onStep` runs after each press, so a caller sampling through the sweep catches
 * a value that holds at both ends and moves in between. The last press or two
 * clamp at {@link MAP_ZOOM_MAX} — the ceiling is not a whole number of steps —
 * so a sweep ends at the ceiling rather than past it. The view does not reset
 * afterwards: a case that sweeps twice against one plat starts the second sweep
 * already at the ceiling, so sample every mark inside one sweep rather than
 * running one per mark.
 */
export function zoomToCeiling(plot: Element, onStep?: () => void) {
	for (let press = 0; press < CEILING_PRESSES; press += 1) {
		fireEvent.keyDown(plot, { key: '+' })

		onStep?.()
	}
}
