'use client'

import { MapPin } from 'lucide-react'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Combobox, ComboboxDescription, ComboboxLabel, ComboboxOption } from '../combobox'
import { Icon } from '../icon'
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
	debounceMs = 250,
	minQueryLength = 3,
	placeholder = 'Enter an address',
	autoComplete = 'off',
	...props
}: AddressInputProps) {
	return (
		<Combobox<AddressSuggestion>
			{...props}
			placeholder={placeholder}
			autoComplete={autoComplete}
			displayValue={(s) => s.label}
			icon={<Icon icon={<MapPin />} />}
		>
			{(query) => (
				<AddressOptions
					query={query}
					provider={provider}
					debounceMs={debounceMs}
					minQueryLength={minQueryLength}
				/>
			)}
		</Combobox>
	)
}

type AddressOptionsProps = {
	query: string
	provider: AddressProvider
	debounceMs: number
	minQueryLength: number
}

function AddressOptions({ query, provider, debounceMs, minQueryLength }: AddressOptionsProps) {
	const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
	const abortRef = useRef<AbortController | null>(null)

	useEffect(() => {
		if (query.length < minQueryLength) {
			abortRef.current?.abort()
			setSuggestions([])
			return
		}

		const timeout = setTimeout(() => {
			abortRef.current?.abort()

			const controller = new AbortController()
			abortRef.current = controller

			provider(query, { signal: controller.signal })
				.then((results) => {
					if (!controller.signal.aborted) setSuggestions(results)
				})
				.catch((error: unknown) => {
					if (controller.signal.aborted) return
					if (error instanceof DOMException && error.name === 'AbortError') return
					setSuggestions([])
				})
		}, debounceMs)

		return () => {
			clearTimeout(timeout)
			abortRef.current?.abort()
		}
	}, [query, provider, debounceMs, minQueryLength])

	return (
		<>
			{suggestions.map((suggestion) => (
				<ComboboxOption key={suggestion.id} value={suggestion}>
					<ComboboxLabel>{suggestion.label}</ComboboxLabel>
					{suggestion.description ? (
						<ComboboxDescription>{suggestion.description}</ComboboxDescription>
					) : null}
				</ComboboxOption>
			))}
		</>
	)
}
