'use client'

import { MapPin } from 'lucide-react'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Combobox, ComboboxDescription, ComboboxLabel, ComboboxOption } from '../combobox'
import { Icon } from '../icon'
import { Spinner } from '../spinner'
import { photonProvider } from './photon'
import type { AddressProvider, AddressSuggestion } from './types'

export type AddressInputProps = {
	id?: string
	value?: AddressSuggestion
	defaultValue?: AddressSuggestion
	onChange?: (value: AddressSuggestion | undefined) => void
	provider?: AddressProvider
	placeholder?: string
	debounceMs?: number
	minQueryLength?: number
	className?: string
	autoComplete?: React.InputHTMLAttributes<HTMLInputElement>['autoComplete']
}

export function AddressInput({
	provider = photonProvider,
	debounceMs = 500,
	minQueryLength = 3,
	placeholder = 'Enter an address',
	autoComplete = 'off',
	...props
}: AddressInputProps) {
	const [query, setQuery] = useState('')

	const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])

	const [loading, setLoading] = useState(false)

	const [ready, setReady] = useState(false)

	const [menuRequested, setMenuRequested] = useState(false)

	const abortRef = useRef<AbortController | null>(null)

	useEffect(() => {
		if (!menuRequested) return

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

			provider(query, { signal: controller.signal })
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
	}, [query, menuRequested, provider, debounceMs, minQueryLength])

	return (
		<Combobox<AddressSuggestion>
			{...props}
			placeholder={placeholder}
			autoComplete={autoComplete}
			displayValue={(s) => s.label}
			icon={loading ? <Spinner /> : <Icon icon={<MapPin />} />}
			clearOnEmpty
			open={ready && menuRequested}
			onOpenChange={setMenuRequested}
			onQueryChange={setQuery}
		>
			{suggestions.map((suggestion) => (
				<ComboboxOption key={suggestion.id} value={suggestion}>
					<ComboboxLabel>{suggestion.label}</ComboboxLabel>
					{suggestion.description ? (
						<ComboboxDescription>{suggestion.description}</ComboboxDescription>
					) : null}
				</ComboboxOption>
			))}
		</Combobox>
	)
}
