'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { checkBuild } from './build-check'
import { useBuildWatch } from './use-build-watch'

/** How often a live page renders again. The server caches of live data hold one minute. */
const REFRESH_MS = 60_000

/**
 * Renders the page again on the server each minute while `live` holds, so live
 * data moves without a reload: the scores of a week in play in picks, and the
 * counts of a race in elections. A hidden tab skips the refresh.
 *
 * @remarks
 * Each refresh starts only after `checkBuild` gives `same`, so Next never
 * reloads the page for it. A minute with no answer skips the refresh. After
 * a deploy, the refresh stops, and `useNewBuild` gives `true`.
 *
 * An app that renders this component must serve `GET` of `shared/refresh/build`
 * at `/api/build`.
 */
export function LiveRefresh({ live }: { live: boolean }) {
	const router = useRouter()

	const newBuild = useBuildWatch()

	useEffect(() => {
		if (!live || newBuild) return

		let active = true

		const timer = window.setInterval(async () => {
			if (document.visibilityState !== 'visible') return

			if ((await checkBuild()) === 'same' && active) router.refresh()
		}, REFRESH_MS)

		return () => {
			active = false

			window.clearInterval(timer)
		}
	}, [live, newBuild, router])

	return null
}
