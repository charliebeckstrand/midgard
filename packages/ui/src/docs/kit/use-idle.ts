import { useEffect } from 'react'
import { cancelIdle, requestIdle } from '../../utilities/idle.ts'
import { FALLBACK_DELAY_MS } from './idle.ts'

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
