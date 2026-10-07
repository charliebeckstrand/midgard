import { useLayoutEffect, useState } from 'react'
import type { EventLog } from './log.ts'
import { start } from './recorder.ts'

/**
 * Starts the log of this tab, and returns it. The log records nothing while
 * the sheet of a debug tool is open, so the sheet does not record itself.
 */
export function usePausedLog(open: boolean): EventLog {
	const [log] = useState(start)

	// A layout effect runs before the effect of the overlay that reports the
	// open, so the log does not record the open of the sheet. A sheet that
	// unmounts while it is open does not leave the log paused.
	useLayoutEffect(() => {
		log.paused = open

		return () => {
			log.paused = false
		}
	}, [log, open])

	return log
}
