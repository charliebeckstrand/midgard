'use client'

import { useEffect } from 'react'

/**
 * Writes `message` to the console in development while `active` holds. It
 * warns once as `active` turns true, and again each time it turns true after
 * that. A production build warns of nothing.
 *
 * @remarks Use it for a setting that fails silently: a prop that has no
 * effect in the configuration around it. The warning tells the developer so.
 *
 * @param active Whether the setting that fails is present now.
 * @param message The text of the warning.
 * @internal
 */
export function useDevWarning(active: boolean, message: string): void {
	useEffect(() => {
		if (process.env.NODE_ENV === 'production') return

		if (active) console.warn(message)
	}, [active, message])
}
