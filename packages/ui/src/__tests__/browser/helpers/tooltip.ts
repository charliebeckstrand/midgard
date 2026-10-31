import { screen } from '../../helpers'
import { pause } from './wall-clock'

/**
 * Waits past the 250 ms hover delay of the tooltip, with no pointer leave to
 * cancel it. Returns the open tooltip, or `null`.
 *
 * @remarks
 * Start it after the hover. No signal tells that a tooltip did not open, so the
 * wait is a hold through `pause()`.
 *
 * @returns The open tooltip, or `null` when no tooltip is open.
 */
export async function tooltipAfterHover(): Promise<HTMLElement | null> {
	await pause(400)

	return screen.queryByRole('tooltip')
}
