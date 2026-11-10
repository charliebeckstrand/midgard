'use client'

import { useEffect } from 'react'
import { checkBuild, readDocumentBuild } from './build'
import { useNewBuild } from './use-new-build'

/** How often the watch reads the build of the server. */
const WATCH_MS = 60_000

/**
 * Reads the build of the server each minute while the tab is visible, and
 * gives `true` once the server runs a new build. The watch reads only the ID
 * of the build, never data, and it stops after a new build.
 *
 * An app that calls this hook must serve `GET` of `shared/refresh/build` at
 * `/api/build`.
 */
export function useBuildWatch(): boolean {
	const newBuild = useNewBuild()

	useEffect(() => {
		// The first read gives the build of the document, so it starts when the page hydrates.
		void readDocumentBuild()

		if (newBuild) return

		const timer = window.setInterval(() => {
			if (document.visibilityState === 'visible') void checkBuild()
		}, WATCH_MS)

		return () => window.clearInterval(timer)
	}, [newBuild])

	return newBuild
}
