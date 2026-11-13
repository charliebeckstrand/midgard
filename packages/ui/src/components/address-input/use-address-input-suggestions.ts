'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import type { AddressProvider, AddressSuggestion } from './types'

type AddressSuggestionsOptions = {
	enabled: boolean
	provider: AddressProvider
	query: string
	debounce: number
	minQueryLength: number
	onError?: (error: unknown) => void
}

export function useAddressInputSuggestions({
	enabled,
	provider,
	query,
	debounce,
	minQueryLength,
	onError,
}: AddressSuggestionsOptions) {
	const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])

	const [loading, setLoading] = useState(false)

	const [ready, setReady] = useState(false)

	// Read from the debounce timer, so a new provider identity never restarts the fetch effect.
	const fetchSuggestions = useEffectEvent(provider)

	// Raised the same way, and for the same reason: a new callback identity must
	// not restart a fetch that is already in flight.
	const notifyError = useEffectEvent((error: unknown) => {
		onError?.(error)
	})

	useEffect(() => {
		if (!enabled) {
			// Disabled mid-flight (e.g. the field closed): the prior run's cleanup
			// aborts the request; loading/ready reset here.
			setLoading(false)

			setReady(false)

			return
		}

		// Gate on the trimmed length, so white space alone never reaches the
		// provider (Photon answers HTTP 400 for a blank `q`). The provider still
		// gets the query as typed: normalizing it is the provider's concern.
		if (query.trim().length < minQueryLength) {
			setSuggestions([])

			setLoading(false)

			setReady(false)

			return
		}

		setLoading(true)

		// Leave `ready` as-is: collapsing it unmounts an open menu on every
		// keystroke until the debounced fetch resolves. Prior results stay
		// visible (with the spinner) until new results arrive.

		// An empty query fetches without debouncing, so a `minQueryLength: 0` field
		// paints its unfiltered suggestions on focus rather than after `debounce`.
		// Unreachable at the default `minQueryLength`, which returns above.
		const delay = query.length === 0 ? 0 : debounce

		// One request for each run. The cleanup of the run aborts it, and React
		// runs that cleanup before the next run.
		const controller = new AbortController()

		const timeout = setTimeout(() => {
			// Started inside a promise, so a provider that throws synchronously
			// takes the same path as one that rejects: `loading` clears and
			// `onError` fires, where a bare call would throw out of this timer.
			Promise.resolve()
				.then(() => fetchSuggestions(query, { signal: controller.signal }))
				.then((results) => {
					if (controller.signal.aborted) return

					setSuggestions(results)

					setLoading(false)

					setReady(true)
				})
				.catch((error: unknown) => {
					if (controller.signal.aborted) return

					if (error instanceof DOMException && error.name === 'AbortError') return

					setSuggestions([])

					setLoading(false)

					setReady(true)

					// An empty list is also what a genuine no-match renders, so the
					// field shows a provider outage as "no results". The rejection
					// goes to the caller rather than nowhere.
					notifyError(error)
				})
		}, delay)

		return () => {
			clearTimeout(timeout)

			controller.abort()
		}
	}, [query, enabled, debounce, minQueryLength])

	return { suggestions, loading, ready }
}
