'use client'

import { MapPin } from 'lucide-react'
import { type InputHTMLAttributes, useState } from 'react'
import { Combobox, ComboboxDescription, ComboboxLabel, ComboboxOption } from '../combobox'
import { Icon } from '../icon'
import { LoadingSpinner } from '../loading'
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
	/** Accessible name for the field. Defaults to the placeholder. */
	'aria-label'?: string
}

/** Address autocomplete over a pluggable geocoding `provider` — built on Combobox, debounces the query and only fetches once `minQueryLength` is reached. */
export function AddressInput({
	value,
	onValueChange,
	provider = photonProvider,
	debounceMs = 500,
	minQueryLength = 3,
	placeholder = 'Enter an address',
	autoComplete = 'off',
	'aria-label': ariaLabel,
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

	const suffix = loading ? <LoadingSpinner /> : <Icon icon={<MapPin />} />

	return (
		<Combobox<AddressSuggestion>
			{...props}
			data-slot="address-input"
			value={value}
			displayValue={(s) => s.label}
			onValueChange={onValueChange}
			placeholder={placeholder}
			aria-label={ariaLabel ?? placeholder}
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
