import { useEffect, useState } from 'react'

export const SECOND = 1000
export const MINUTE = 60 * SECOND
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

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
