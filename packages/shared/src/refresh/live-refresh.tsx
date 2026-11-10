'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** How often a live page renders again. The server caches of live data hold one minute. */
const REFRESH_MS = 60_000

/**
 * Renders the page again on the server each minute while `live` holds, so live
 * data moves without a reload: the scores of a week in play in picks, and the
 * counts of a race in elections. A hidden tab skips the refresh.
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
