'use client'

import { MapPin } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { keyByOccurrence } from '../../utilities'
import {
	Combobox,
	ComboboxDescription,
	ComboboxLabel,
	ComboboxOption,
	type ComboboxProps,
} from '../combobox'
import { useControl } from '../control/context'
import { useFormField } from '../form/context'
import { Icon } from '../icon'
import { LoadingSpinner } from '../loading'
import { photonProvider } from './address-input-photon'
import type { AddressProvider, AddressSuggestion } from './types'
import { useAddressInputSuggestions } from './use-address-input-suggestions'

/** Props for {@link AddressInput}; selection is an {@link AddressSuggestion}, bound by `name`, controlled via `value`, or uncontrolled via `defaultValue`. */
export type AddressInputProps = Omit<
	ComboboxProps<AddressSuggestion>,
	| 'value'
	| 'defaultValue'
	| 'onValueChange'
	| 'multiple'
	| 'displayValue'
	| 'summarize'
	| 'suffix'
	| 'open'
	| 'onOpenChange'
	| 'onQueryChange'
	| 'clearOnEmpty'
	| 'children'
> & {
	/**
	 * Binds the selection to the enclosing Form field of this name
	 * (CONVENTIONS §7.2). Seed `Form.defaultValues` with an
	 * {@link AddressSuggestion} or `undefined`; the field's errors mark the
	 * control invalid.
	 */
	name?: string
	value?: AddressSuggestion | null
	defaultValue?: AddressSuggestion
	onValueChange?: (value: AddressSuggestion | null) => void
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
	/**
	 * Fires when the `provider` rejects, with whatever it threw.
	 *
	 * The field cannot report this itself. A failed fetch empties the suggestion
	 * list, which is also what a genuine no-match renders, so "no results" means
	 * both. A provider outage, a refused key, and a network failure all land here.
	 * An aborted fetch does not: a new keystroke or a closed menu cancels the
	 * previous request by design. Use it to surface the failure, or to fall back to
	 * a plain text field.
	 */
	onError?: (error: unknown) => void
	/** Accessible name for the field. Defaults to the placeholder, where no `<Field>`/`<Label>` names it. */
	'aria-label'?: string
}

/**
 * Address autocomplete over a pluggable geocoding `provider`. Built on
 * `<Combobox>`: debounces the query by `debounceMs`, fetches once the query
 * reaches `minQueryLength`, and renders each {@link AddressSuggestion} as a
 * labeled option with optional description. The suffix tracks selection state.
 * It shows a `<LoadingSpinner>` while fetching, and a `<MapPin>` when empty or
 * disabled. Otherwise it cedes the slot to the Combobox clear button. The
 * whole field pulses (`animate-pulse`) while a fetch is in flight.
 *
 * It searches by business or place name as readily as by address. The default
 * provider leads a named match with its name and carries the street line
 * beneath. Typing "Clearwater Restaurant" therefore resolves the restaurant and
 * its position. The selection carries the parts either way:
 * {@link AddressSuggestion.name}, `address`, `latitude`, `longitude`. A
 * consumer can therefore store the name and the address apart, or plot the point.
 *
 * @remarks
 * Client component. Defaults to {@link photonProvider}; reach for
 * {@link createPhotonProvider} to bias the ranking toward a place or narrow the
 * layers. In-flight requests are aborted on query change or close. Reads
 * enclosing Density/Control context for disabled state and accessible name
 * (falls back to `placeholder`).
 */
export function AddressInput({
	name,
	value,
	defaultValue,
	onValueChange,
	provider = photonProvider,
	debounceMs = 500,
	minQueryLength = 3,
	onError,
	placeholder = 'Enter an address',
	className,
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
		onError,
	})

	// The Combobox this wraps composes the §7.2 cascade itself, so `name` is
	// forwarded rather than bound again here: one writer on the field, and the
	// `invalid` it derives from that field reaches the control for free.
	const bound = useFormField(name)

	// Mirrors an unbound Combobox's selection. Both readings feed one question —
	// whether anything is selected — which the suffix below asks so an undefined
	// suffix cedes the slot to the Combobox's own clear button.
	const [held, setHeld] = useControllable<AddressSuggestion>({
		value,
		defaultValue,
		onValueChange,
	})

	const selected = bound === undefined ? held : (bound.value as AddressSuggestion | undefined)

	const control = useControl()

	// Disabled suppresses the clear button; keep the pin rather than letting
	// the slot fall back to the Combobox chevron. The explicit prop wins, as it
	// does everywhere in the cascade.
	const disabled = props.disabled ?? control?.disabled

	const suffix = loading ? (
		<LoadingSpinner />
	) : selected === undefined || disabled ? (
		<Icon icon={<MapPin />} />
	) : undefined

	return (
		<Combobox<AddressSuggestion>
			{...props}
			data-slot="address-input"
			name={name}
			value={value}
			defaultValue={defaultValue}
			displayValue={(s) => s.label}
			onValueChange={setHeld}
			className={cn(loading && 'animate-pulse', className)}
			placeholder={placeholder}
			// Yields to a wrapping `<Field>`/`<Label>`: an own name shadows it, and a
			// placeholder is not a programmatic name.
			aria-label={ariaLabel ?? (control?.labelledBy ? undefined : placeholder)}
			clearOnEmpty
			clearable
			suffix={suffix}
			open={ready && menuRequested}
			onOpenChange={setMenuRequested}
			onQueryChange={setQuery}
		>
			{/* Keyed by occurrence, not by the id alone: a provider is pluggable, so
			    its ids are its own claim and not this component's guarantee. Photon
			    breaks it in practice: one OSM object is several documents in its
			    index. A search for "Clearwater" therefore returns the same relation
			    twice, once as a village and once as a locality. Both are results a reader
			    can pick, so the pair is kept and only the key is made unique.
			    Selection compares the suggestion objects themselves, which stay
			    distinct however their ids collide. */}
			{keyByOccurrence(suggestions.map((suggestion) => suggestion.id)).map(({ key }, index) => {
				const suggestion = suggestions[index]

				if (suggestion === undefined) return null

				return (
					<ComboboxOption key={key} value={suggestion}>
						<ComboboxLabel>{suggestion.label}</ComboboxLabel>
						{suggestion.description ? (
							<ComboboxDescription>{suggestion.description}</ComboboxDescription>
						) : null}
					</ComboboxOption>
				)
			})}
		</Combobox>
	)
}
