'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** How often a week in play reads the scoreboard again. The cache of a live week holds one minute. */
const REFRESH_MS = 60_000

/**
 * Renders the page again on the server each minute while `live` holds, so the
 * scores and the clocks of a week in play move without a reload. A hidden tab
 * skips the refresh.
 */
export function LiveRefresh({ live }: { live: boolean }) {
	const router = useRouter()

	useEffect(() => {
		if (!live) return

		const timer = window.setInterval(() => {
			if (document.visibilityState === 'visible') router.refresh()
		}, REFRESH_MS)

		return () => window.clearInterval(timer)
	}, [live, router])

	return null
}
