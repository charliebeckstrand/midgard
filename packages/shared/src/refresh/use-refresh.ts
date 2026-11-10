'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef, useTransition } from 'react'
import { defineMessages, useIntl } from 'ui/primitives/intl'
import { useToast } from 'ui/toast'
import { checkBuild } from './build'

const messages = defineMessages({
	failed: {
		id: 'shared.refresh.failed',
		defaultMessage: 'Could not refresh',
		description:
			'The title of the toast that shows when a refresh of the page got no answer from the server.',
	},
})

/** The state of a manual refresh, and the function that starts it. */
export type Refresh = {
	/** Checks the build of the server, then renders the page again in place. */
	refresh: () => void
	/** A refresh is in flight: the check, or the render of the page. */
	pending: boolean
}

/**
 * Renders the page again on the server when the reader asks, in place and
 * with no reload. The refresh starts only when the server runs the build of
 * this document (`checkBuild`). After a deploy, the check sets the flag of
 * `useNewBuild` instead, and only a reload can load the new build.
 *
 * A check with no answer keeps the page as it is, and shows an error toast.
 * The next press removes that toast, so the failures do not stack.
 *
 * An app that calls this hook must serve `GET` of `shared/refresh/build` at
 * `/api/build`, under the `UIProvider` of `AppProviders`.
 */
export function useRefresh(): Refresh {
	const router = useRouter()

	const intl = useIntl()

	const { toast, dismiss } = useToast()

	const [pending, startTransition] = useTransition()

	/** The id of the toast of the last failure, while it can still show. */
	const failure = useRef<string | undefined>(undefined)

	const refresh = useCallback(() => {
		if (failure.current) dismiss(failure.current)

		failure.current = undefined

		startTransition(async () => {
			const check = await checkBuild()

			if (check === 'unknown') {
				failure.current = toast({ severity: 'error', title: intl.formatMessage(messages.failed) })
			}

			// An update after an `await` needs its own transition, so `pending`
			// holds until the new page renders.
			if (check === 'same') startTransition(() => router.refresh())
		})
	}, [router, intl, toast, dismiss])

	return { refresh, pending }
}
