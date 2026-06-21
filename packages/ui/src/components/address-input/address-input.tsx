'use client'

import { MapPin } from 'lucide-react'
import { type InputHTMLAttributes, useState } from 'react'
import { Combobox, ComboboxDescription, ComboboxLabel, ComboboxOption } from '../combobox'
import { Icon } from '../icon'
import { LoadingSpinner } from '../loading'
import { photonProvider } from './address-input-photon'
import type { AddressProvider, AddressSuggestion } from './types'
import { useAddressInputSuggestions } from './use-address-input-suggestions'

/** Props for {@link AddressInput}; selection is an {@link AddressSuggestion}, controlled via `value` or uncontrolled via `defaultValue`. */
export type AddressInputProps = {
	id?: string
	value?: AddressSuggestion
	defaultValue?: AddressSuggestion
	onValueChange?: (value: AddressSuggestion | undefined) => void
	/**
	 * Geocoding strategy resolving the query to suggestions.
	 * @defaultValue {@link photonProvider}
	 */
	provider?: AddressProvider
	/** @defaultValue 'Enter an address' */
	placeholder?: string
	/**
	 * Delay before the typed query triggers a provider fetch.
	 * @defaultValue 500
	 */
	debounceMs?: number
	/**
	 * Shortest query length that triggers a fetch; below it the menu stays empty.
	 * @defaultValue 3
	 */
	minQueryLength?: number
	className?: string
	/** @defaultValue 'off' */
	autoComplete?: InputHTMLAttributes<HTMLInputElement>['autoComplete']
	/** Accessible name for the field. Defaults to the placeholder. */
	'aria-label'?: string
}

// Leading location pin; static and decorative, hoisted for a stable identity.
const ADDRESS_PREFIX = <Icon icon={<MapPin />} />

/**
 * Address autocomplete over a pluggable geocoding `provider`. Built on
 * `<Combobox>`: debounces the query by `debounceMs`, fetches once the query
 * reaches `minQueryLength`, and renders each {@link AddressSuggestion} as a
 * labeled option with optional description. A leading `<MapPin>` marks the
 * prefix; the suffix shows a `<LoadingSpinner>` while fetching and otherwise
 * cedes the slot to the Combobox clear button (when an address is selected) or
 * chevron.
 *
 * @remarks
 * Client component. Defaults to {@link photonProvider}. In-flight requests are
 * aborted on query change or close. Reads enclosing Density/Control context
 * for disabled state and accessible name (falls back to `placeholder`).
 */
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

	// A spinner owns the suffix while fetching; otherwise the slot falls to the
	// Combobox's clear button (when an address is selected) or chevron.
	const suffix = loading ? <LoadingSpinner /> : undefined

	return (
		<Combobox<AddressSuggestion>
			{...props}
			data-slot="address-input"
			value={value}
			defaultValue={defaultValue}
			displayValue={(s) => s.label}
			onValueChange={onValueChange}
			placeholder={placeholder}
			aria-label={ariaLabel ?? placeholder}
			autoComplete={autoComplete}
			clearOnEmpty
			clearable
			prefix={ADDRESS_PREFIX}
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
