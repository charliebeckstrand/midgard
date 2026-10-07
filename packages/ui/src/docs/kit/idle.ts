import { useEffect } from 'react'
import { cancelIdle, requestIdle } from '../../utilities/idle.ts'

/**
 * The delay of the fallback in a browser with no `requestIdleCallback`, such as
 * Safari. The docs work starts at once there, with no deadline.
 */
const FALLBACK_DELAY_MS = 1

/**
 * Runs `task` once in idle time after the mount, so a later step that needs
 * its result does not wait.
 *
 * @param task - The work, such as the load of a module. It must keep its
 *   identity, or it runs again after each render that changes it. The signal
 *   aborts when the component unmounts or the task changes.
 */
export function useIdle(task: (signal: AbortSignal) => unknown): void {
	useEffect(() => {
		const controller = new AbortController()

		const handle = requestIdle(() => {
			task(controller.signal)
		}, FALLBACK_DELAY_MS)

		return () => {
			cancelIdle(handle)

			controller.abort()
		}
	}, [task])
}

/**
 * Runs `step` in idle time until it returns `false` or `signal` aborts. Each
 * idle period runs `step` once, and then again while more than 2 ms of the
 * period stay, so the work does not make a long task. With no deadline, each
 * timeout runs `step` once.
 */
export function runInSlices(step: () => boolean, signal: AbortSignal): void {
	const slice = (deadline?: IdleDeadline) => {
		do {
			if (signal.aborted || !step()) return
		} while ((deadline?.timeRemaining() ?? 0) > 2)

		requestIdle(slice, FALLBACK_DELAY_MS)
	}

	requestIdle(slice, FALLBACK_DELAY_MS)
}
