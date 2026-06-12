'use client'

import { MapPin } from 'lucide-react'
import { type InputHTMLAttributes, useState } from 'react'
import { useControllable } from '../../hooks'
import { Combobox, ComboboxDescription, ComboboxLabel, ComboboxOption } from '../combobox'
import { useControl } from '../control/context'
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

/** Address autocomplete over a pluggable geocoding `provider`. Built on Combobox; debounces the query and fetches once `minQueryLength` is reached. */
export function AddressInput({
	value,
	defaultValue,
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

	// Mirrors the Combobox selection (controlled or not) so the suffix can
	// react to it: an undefined suffix lets the Combobox's `clearable` button
	// take the slot while an address is selected.
	const [selected, setSelected] = useControllable<AddressSuggestion>({
		value,
		defaultValue,
		onValueChange,
	})

	// Disabled suppresses the clear button; keep the pin rather than letting
	// the slot fall back to the Combobox chevron.
	const disabled = useControl()?.disabled

	const suffix = loading ? (
		<LoadingSpinner />
	) : selected === undefined || disabled ? (
		<Icon icon={<MapPin />} />
	) : undefined

	return (
		<Combobox<AddressSuggestion>
			{...props}
			data-slot="address-input"
			value={value}
			defaultValue={defaultValue}
			displayValue={(s) => s.label}
			onValueChange={setSelected}
			placeholder={placeholder}
			aria-label={ariaLabel ?? placeholder}
			autoComplete={autoComplete}
			clearOnEmpty
			clearable
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
