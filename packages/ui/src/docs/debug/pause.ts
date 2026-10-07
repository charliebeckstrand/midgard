import { useLayoutEffect, useState } from 'react'
import { type Debug, start } from './recorder.ts'

/**
 * Starts the logs of this tab, and returns them. The Event log records
 * nothing while the sheet of a debug tool is open, so the sheet does not
 * record itself.
 */
export function useDebug(open: boolean): Debug {
	const [debug] = useState(start)

	// A layout effect runs before the effect of the overlay that reports the
	// open, so the log does not record the open of the sheet. A sheet that
	// unmounts while it is open does not leave the log paused.
	useLayoutEffect(() => {
		debug.log.paused = open

		return () => {
			debug.log.paused = false
		}
	}, [debug, open])

	return debug
}
