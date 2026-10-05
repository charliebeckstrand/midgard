import { useEffect } from 'react'

/**
 * Runs `task` once in idle time after the mount, so a later step that needs
 * its result does not wait. A browser with no `requestIdleCallback`, such as
 * Safari, runs the task after a timeout of 1 ms.
 *
 * @param task - The work, such as the load of a module. It must keep its
 *   identity, or it runs again after each render that changes it.
 */
export function useIdle(task: () => unknown): void {
	useEffect(() => {
		const idle = window.requestIdleCallback ?? ((callback: () => void) => setTimeout(callback, 1))

		const cancel = window.cancelIdleCallback ?? clearTimeout

		const handle = idle(() => {
			task()
		})

		return () => cancel(handle)
	}, [task])
}
