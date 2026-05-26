import { useEffect, useRef, useState } from 'react'
import type { AddressProvider, AddressSuggestion } from './types'

type UseAddressSuggestionsOptions = {
	enabled: boolean
	provider: AddressProvider
	query: string
	debounceMs: number
	minQueryLength: number
}

export function useAddressInputSuggestions({
	enabled,
	provider,
	query,
	debounceMs,
	minQueryLength,
}: UseAddressSuggestionsOptions) {
	const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])

	const [loading, setLoading] = useState(false)

	const [ready, setReady] = useState(false)

	const abortRef = useRef<AbortController | null>(null)

	const providerRef = useRef(provider)

	useEffect(() => {
		providerRef.current = provider
	}, [provider])

	useEffect(() => {
		if (!enabled) return

		if (query.length < minQueryLength) {
			abortRef.current?.abort()

			setSuggestions([])

			setLoading(false)

			setReady(false)

			return
		}

		setLoading(true)

		setReady(false)

		const delay = query.length === 0 ? 0 : debounceMs

		const timeout = setTimeout(() => {
			abortRef.current?.abort()

			const controller = new AbortController()

			abortRef.current = controller

			providerRef
				.current(query, { signal: controller.signal })
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
				})
		}, delay)

		return () => {
			clearTimeout(timeout)

			abortRef.current?.abort()
		}
	}, [query, enabled, debounceMs, minQueryLength])

	return { suggestions, loading, ready }
}
