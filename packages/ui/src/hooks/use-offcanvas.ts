'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Manages offcanvas sidebar state — open/close plus auto-close
 * when the viewport crosses the `--breakpoint-lg` threshold.
 */
export function useOffcanvas() {
	const [open, setOpen] = useState(false)

	const close = useCallback(() => setOpen(false), [])

	useEffect(() => {
		const breakpoint = getComputedStyle(document.documentElement)
			.getPropertyValue('--breakpoint-lg')
			.trim()

		// Bail when the design token isn't defined — `matchMedia('(min-width: )')`
		// is an invalid query, so the listener would never fire and the
		// auto-close-on-resize behavior would silently break.
		if (!breakpoint) return

		const mql = window.matchMedia(`(min-width: ${breakpoint})`)

		const handler = () => {
			if (mql.matches) setOpen(false)
		}

		mql.addEventListener('change', handler)

		return () => mql.removeEventListener('change', handler)
	}, [])

	return { open, setOpen, close }
}
