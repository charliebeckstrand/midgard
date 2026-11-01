import { useEffect, useState } from 'react'

export { DAY, HOUR, MINUTE, SECOND } from '../../../../utilities/time-units.ts'

const STAND_IN = Date.UTC(2026, 5, 15)

/**
 * The time when the example mounts, or a fixed stand-in before the mount. The
 * server has no clock of the reader, so the prerendered HTML and the first
 * client render agree. Thus each example renders its rows in the prerender,
 * and the page does not grow when the clock starts.
 */
export function useNow(): number {
	const [now, setNow] = useState(STAND_IN)

	useEffect(() => {
		setNow(Date.now())
	}, [])

	return now
}
