'use client'

import { markNewBuild } from './use-new-build'

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
 * reads again. A page reads it as it hydrates (`useBuildWatch`), so the first
 * read is near the load of the document.
 */
export function readDocumentBuild(): Promise<string | undefined> {
	documentBuild ??= readServerBuild().then((id) => {
		if (id === undefined) documentBuild = undefined

		return id
	})

	return documentBuild
}

/**
 * The result of a build check: the server runs the build of this document
 * (`same`), a new build (`new`), or gives no answer (`unknown`).
 */
export type BuildCheck = 'same' | 'new' | 'unknown'

/**
 * Compares the build of the server with the build of this document. A new
 * build sets the flag of `useNewBuild`.
 *
 * @remarks
 * Next reloads the document when `router.refresh()` cannot apply in place:
 * when the server runs a new build, when the answer is an error, or when the
 * network is down. So a refresh starts only after a check that gives `same`.
 */
export async function checkBuild(): Promise<BuildCheck> {
	const [own, served] = await Promise.all([readDocumentBuild(), readServerBuild()])

	if (own === undefined || served === undefined) return 'unknown'

	if (served === own) return 'same'

	markNewBuild()

	return 'new'
}
