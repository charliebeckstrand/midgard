import { type DefaultOptions, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import type { ToastInput } from 'ui/toast'
import { RequestError } from '../auth/bifrost'

/** The `meta` of a mutation in an app. */
export type AppMutationMeta = {
	/**
	 * The page shows the error of this mutation in place, so no toast shows it.
	 * A `401` still goes to `/login`.
	 */
	inlineError?: boolean
}

declare module '@tanstack/react-query' {
	interface Register {
		mutationMeta: AppMutationMeta
	}
}

type AppQueryClientOptions = {
	/** The query defaults of the app. */
	queries?: DefaultOptions['queries']
	/** Shows a toast, such as the `toast` of `useToast`. */
	toast: (data: ToastInput) => string
}

// A `401` means that the session ended, so the page goes to the sign-in page.
function signedOut(error: Error): boolean {
	if (!(error instanceof RequestError) || error.status !== 401) return false

	window.location.assign('/login')

	return true
}

/**
 * Makes the `QueryClient` of an app. A query or a mutation that fails with a
 * `401` sends the page to `/login`. Any other failed mutation shows its error
 * in a toast, unless its `meta` sets `inlineError`.
 *
 * @remarks
 * `AppProviders` makes the client, and an app does not call this function. A
 * failed query shows nothing here, because the page that reads the query shows
 * its state.
 */
export function createAppQueryClient({ queries, toast }: AppQueryClientOptions): QueryClient {
	return new QueryClient({
		defaultOptions: { queries },
		queryCache: new QueryCache({ onError: signedOut }),
		mutationCache: new MutationCache({
			onError: (error, _variables, _result, mutation) => {
				if (signedOut(error) || mutation.meta?.inlineError) return

				toast({ severity: 'error', title: 'Something went wrong', description: error.message })
			},
		}),
	})
}

/**
 * The error of the mutation that started last, or `null` when it did not fail.
 * A card that runs several mutations shows this one error, so a later success
 * clears the error of an earlier failure.
 *
 * @example
 * ```tsx
 * const error = latestError(add, remove)
 * ```
 */
export function latestError(
	...mutations: Array<{ error: Error | null; submittedAt: number }>
): Error | null {
	let latest: { error: Error | null; submittedAt: number } | undefined

	for (const mutation of mutations) {
		if (latest === undefined || mutation.submittedAt > latest.submittedAt) latest = mutation
	}

	return latest?.error ?? null
}
