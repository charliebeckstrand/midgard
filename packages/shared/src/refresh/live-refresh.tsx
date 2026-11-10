'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { markNewBuild } from './new-build'

/** How often a live page renders again. The server caches of live data hold one minute. */
const REFRESH_MS = 60_000

/** The route that gives the ID of the build of the server (`build-route.ts`). */
const BUILD_URL = '/api/build'

/**
 * Reads the ID of the build that the server runs. The result is `undefined`
 * when the server gives no ID: the network is down, or the answer is an error.
 */
async function readServerBuild(): Promise<string | undefined> {
	try {
		const response = await fetch(BUILD_URL, { cache: 'no-store' })

		return response.ok ? await response.text() : undefined
	} catch {
		return undefined
	}
}

/** The build of the scripts of this document, after the first read. */
let documentBuild: Promise<string | undefined> | undefined

/**
 * Reads the build of the scripts of this document: the build that the server
 * runs at the first read. A read that fails is not kept, so the next call
 * reads again.
 */
function readDocumentBuild(): Promise<string | undefined> {
	documentBuild ??= readServerBuild().then((id) => {
		if (id === undefined) documentBuild = undefined

		return id
	})

	return documentBuild
}

/**
 * Renders the page again on the server each minute while `live` holds, so live
 * data moves without a reload: the scores of a week in play in picks, and the
 * counts of a race in elections. A hidden tab skips the refresh.
 *
 * @remarks
 * Next reloads the document when a refresh cannot apply in place: when the
 * server runs a new build, when the answer is an error, or when the network
 * is down. So before each refresh, this component reads the build of the
 * server from `/api/build`, and it refreshes only when the server runs the
 * build of the document. A failed read skips the refresh of that minute.
 *
 * After a deploy, the page cannot take the data of the new build. The page
 * then stays as it is, the refresh stops, and `useNewBuild` gives `true`, so
 * the page can show a link that reloads it.
 *
 * An app that renders this component must serve `GET` of `shared/refresh/build`
 * at `/api/build`.
 */
export function LiveRefresh({ live }: { live: boolean }) {
	const router = useRouter()

	// The first read gives the build of the document, so it starts when the page hydrates.
	useEffect(() => {
		void readDocumentBuild()
	}, [])

	useEffect(() => {
		if (!live) return

		let active = true

		const timer = window.setInterval(async () => {
			if (document.visibilityState !== 'visible') return

			const [own, served] = await Promise.all([readDocumentBuild(), readServerBuild()])

			if (!active || own === undefined || served === undefined) return

			if (served === own) {
				router.refresh()

				return
			}

			// The data of a new build needs its scripts, which only a reload gives.
			window.clearInterval(timer)

			markNewBuild()
		}, REFRESH_MS)

		return () => {
			active = false

			window.clearInterval(timer)
		}
	}, [live, router])

	return null
}
