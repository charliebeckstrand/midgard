'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { checkBuild, readDocumentBuild } from './build'
import { useNewBuild } from './use-new-build'

/** How often a live page renders again. The server caches of live data hold one minute. */
const REFRESH_MS = 60_000

/**
 * Renders the page again on the server each minute while `live` holds, so live
 * data moves without a reload, such as the scores of a week in play in picks. A
 * hidden tab skips the refresh.
 *
 * @remarks
 * Each refresh starts only after `checkBuild` gives `same`, so Next never
 * reloads the page for it. A minute with no answer skips the refresh. After
 * a deploy, the refresh stops, and `useNewBuild` gives `true`. The check of
 * each refresh is the only read of the build, so the page does not run the
 * watch of `useBuildWatch` too.
 *
 * An app that renders this component must serve `GET` of `shared/refresh/build`
 * at `/api/build`.
 */
export function LiveRefresh({ live }: { live: boolean }) {
	const router = useRouter()

	const newBuild = useNewBuild()

	// The first read gives the build of the document, so it starts when the page hydrates.
	useEffect(() => {
		void readDocumentBuild()
	}, [])

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
