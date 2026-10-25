import { useEffect, useState } from 'react'

export { DAY, HOUR, MINUTE, SECOND } from '../../../../utilities/time-units.ts'

/**
 * The time when the example mounts, or `null` before the mount. The server
 * has no value, so the prerendered HTML and the first client render agree.
 */
export function useNow(): number | null {
	const [now, setNow] = useState<number | null>(null)

	useEffect(() => {
		setNow(Date.now())
	}, [])

	return now
}
