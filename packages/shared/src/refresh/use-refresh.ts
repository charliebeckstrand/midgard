'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { checkBuild } from './build'

/** The state of a manual refresh, and the function that starts it. */
export type Refresh = {
	/** Checks the build of the server, then renders the page again in place. */
	refresh: () => void
	/** A refresh is in flight: the check, or the render of the page. */
	pending: boolean
	/** The last refresh got no answer, so the page stayed as it was. */
	failed: boolean
}

/**
 * Renders the page again on the server when the reader asks, in place and
 * with no reload. The refresh starts only when the server runs the build of
 * this document (`checkBuild`). After a deploy, the check sets the flag of
 * `useNewBuild` instead, and only a reload can load the new build.
 *
 * An app that calls this hook must serve `GET` of `shared/refresh/build` at
 * `/api/build`.
 */
export function useRefresh(): Refresh {
	const router = useRouter()

	const [pending, startTransition] = useTransition()

	const [failed, setFailed] = useState(false)

	const refresh = useCallback(() => {
		startTransition(async () => {
			const check = await checkBuild()

			setFailed(check === 'unknown')

			// An update after an `await` needs its own transition, so `pending`
			// holds until the new page renders.
			if (check === 'same') startTransition(() => router.refresh())
		})
	}, [router])

	return { refresh, pending, failed }
}
