import { requestIdle } from '../../utilities/idle.ts'

/**
 * The delay of the fallback in a browser with no `requestIdleCallback`, such as
 * Safari. The docs work starts at once there, with no deadline.
 */
export const FALLBACK_DELAY_MS = 1

/**
 * The time in ms that an idle period must still hold for {@link runInSlices}
 * to run its step again in that period.
 */
const SLICE_MARGIN_MS = 2

/**
 * Runs `step` in idle time until it returns `false` or `signal` aborts. Each
 * idle period runs `step` once, and then again while more than
 * {@link SLICE_MARGIN_MS} of the period stay, so the work does not make a
 * long task. With no deadline, each
 * timeout runs `step` once.
 */
export function runInSlices(step: () => boolean, signal: AbortSignal): void {
	const slice = (deadline?: IdleDeadline) => {
		do {
			if (signal.aborted || !step()) return
		} while ((deadline?.timeRemaining() ?? 0) > SLICE_MARGIN_MS)

		requestIdle(slice, FALLBACK_DELAY_MS)
	}

	requestIdle(slice, FALLBACK_DELAY_MS)
}
