'use client'

import { MapPin } from 'lucide-react'
import { type InputHTMLAttributes, useState } from 'react'
import { Combobox, ComboboxDescription, ComboboxLabel, ComboboxOption } from '../combobox'
import { Icon } from '../icon'
import { Spinner } from '../spinner'
import { photonProvider } from './address-input-photon'
import type { AddressProvider, AddressSuggestion } from './types'
import { useAddressInputSuggestions } from './use-address-input-suggestions'

export type AddressInputProps = {
	id?: string
	value?: AddressSuggestion
	defaultValue?: AddressSuggestion
	onValueChange?: (value: AddressSuggestion | undefined) => void
	provider?: AddressProvider
	placeholder?: string
	debounceMs?: number
	minQueryLength?: number
	className?: string
	autoComplete?: InputHTMLAttributes<HTMLInputElement>['autoComplete']
}

export function AddressInput({
	value,
	onValueChange,
	provider = photonProvider,
	debounceMs = 500,
	minQueryLength = 3,
	placeholder = 'Enter an address',
	autoComplete = 'off',
	...props
}: AddressInputProps) {
	const [query, setQuery] = useState('')

	const [menuRequested, setMenuRequested] = useState(false)

	const { suggestions, loading, ready } = useAddressInputSuggestions({
		enabled: menuRequested,
		provider,
		query,
		debounceMs,
		minQueryLength,
	})

	const suffix = loading ? <Spinner /> : <Icon icon={<MapPin />} />

	return (
		<Combobox<AddressSuggestion>
			{...props}
			value={value}
			displayValue={(s) => s.label}
			onValueChange={onValueChange}
			placeholder={placeholder}
			autoComplete={autoComplete}
			clearOnEmpty
			suffix={suffix}
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
