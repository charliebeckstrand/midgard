/**
 * What a keypress means to the cursor. The one table mapping keys to intent,
 * so the plot region's handler reads a decision rather than a key name and a
 * new binding lands in a single place.
 */

/** A compass step — the four directions an arrow key reads as. @internal */
export type MapCompassAction = 'north' | 'south' | 'east' | 'west'

/** What a key does to the cursor: a compass step, a jump to an end, or a clear. @internal */
export type MapCursorAction = MapCompassAction | 'first' | 'last' | 'clear'

/**
 * Reads a key to a cursor action. The arrows step by compass direction, which
 * is the map's own pair of axes where a chart's arrows step its category and
 * value axes; Home and End jump to the first and last drawn region in the
 * atlas's own order; Escape clears. Every other key returns `null` and stays
 * with the browser.
 *
 * @internal
 */
export function keyAction(key: string): MapCursorAction | null {
	switch (key) {
		case 'ArrowUp':
			return 'north'
		case 'ArrowDown':
			return 'south'
		case 'ArrowRight':
			return 'east'
		case 'ArrowLeft':
			return 'west'
		case 'Home':
			return 'first'
		case 'End':
			return 'last'
		case 'Escape':
			return 'clear'
		default:
			return null
	}
}

/** Whether a key activates the region under the cursor — Enter, or Space. @internal */
export function isMapActivateKey(key: string): boolean {
	return key === 'Enter' || key === ' '
}
