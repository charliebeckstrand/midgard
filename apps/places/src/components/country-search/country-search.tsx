'use client'

import { type PointerEvent, useEffect, useEffectEvent, useId, useRef } from 'react'
import { Combobox, ComboboxLabel, ComboboxOption, useComboboxDeferredQuery } from 'ui/combobox'
import { ControlSkeleton } from 'ui/control'
import { useTimeout } from 'ui/hooks'
import { ReadyReveal } from 'ui/primitives/ready-reveal'

/**
 * How long, in milliseconds, an option must stay active before the search asks
 * for its pre-render. A reader who moves through the list with the arrow keys
 * passes each option in less time, so only the option that they stop on renders.
 */
const PRELOAD_DWELL_MS = 150

/** Props for {@link CountrySearch}. */
export type CountrySearchProps = {
	/** The countries to list, sorted. */
	countries: readonly string[]
	/** Whether the search can take input. Until it can, a skeleton stands in for it. */
	ready: boolean
	/** Fires when the reader selects a country. */
	onPick: (country: string) => void
	/** Fires when an option stays active for {@link PRELOAD_DWELL_MS}, with its country. */
	onPreload: (country: string) => void
}

/**
 * The options that match the query. Each option id holds the index of its
 * country in the full list, so the search can read the country back from an id.
 */
function CountryOptions({ countries, prefix }: { countries: readonly string[]; prefix: string }) {
	const query = useComboboxDeferredQuery().trim().toLowerCase()

	return countries.map((country, index) =>
		query === '' || country.toLowerCase().includes(query) ? (
			<ComboboxOption key={country} id={`${prefix}${index}`} value={country}>
				<ComboboxLabel>{country}</ComboboxLabel>
			</ComboboxOption>
		) : null,
	)
}

/**
 * A search over the countries, which goes to the country that the reader
 * selects.
 *
 * The active option renders ahead of a selection. An option is active when the
 * pointer is on it, or when the arrow keys highlight it. After
 * {@link PRELOAD_DWELL_MS} on one option, `onPreload` fires with its country.
 * When the active option changes before that time, nothing fires.
 */
export function CountrySearch({ countries, ready, onPick, onPreload }: CountrySearchProps) {
	const inputId = useId()

	const prefix = `${inputId}-country-`

	// The country of the active option, and the timer that waits for it to stay.
	const active = useRef<string | null>(null)

	const dwell = useTimeout()

	const countryOf = (element: EventTarget | Element | null): string | null => {
		const option = element instanceof Element ? element.closest('[role=option]') : null

		if (option === null || !option.id.startsWith(prefix)) return null

		return countries[Number(option.id.slice(prefix.length))] ?? null
	}

	const activate = (country: string | null) => {
		if (country === active.current) return

		active.current = country

		dwell.clear()

		if (country !== null) dwell.set(() => onPreload(country), PRELOAD_DWELL_MS)
	}

	const onHighlight = useEffectEvent((input: HTMLElement) => {
		const id = input.getAttribute('aria-activedescendant')

		activate(id === null ? null : countryOf(document.getElementById(id)))
	})

	// The keyboard highlight. The combobox keeps focus on its input and points
	// `aria-activedescendant` at the highlighted option, so the search reads the
	// highlight from that attribute.
	useEffect(() => {
		const input = document.getElementById(inputId)

		if (input === null) return

		const observer = new MutationObserver(() => onHighlight(input))

		observer.observe(input, { attributes: true, attributeFilter: ['aria-activedescendant'] })

		return () => observer.disconnect()
	}, [inputId])

	// The pointer. The panel is in a portal, and React sends the events of a
	// portal to its React parents, so this wrapper gets them. A move between two
	// elements of one option finds the same country, and `activate` ignores it.
	const onPointerOver = (event: PointerEvent) => activate(countryOf(event.target))

	const onPointerOut = (event: PointerEvent) => activate(countryOf(event.relatedTarget))

	return (
		<div className="min-w-0" onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
			{/* The combobox renders in both states, so it sizes the box, and the
			    skeleton over it never moves the trail. */}
			<ReadyReveal
				ready={ready}
				placeholder={<ControlSkeleton className="size-full" />}
				className="*:min-w-0"
			>
				<Combobox<string>
					id={inputId}
					value={null}
					onValueChange={(country) => {
						if (country !== null) onPick(country)
					}}
					placeholder="Search"
					aria-label="Search countries"
					className="w-56 max-w-full"
				>
					<CountryOptions countries={countries} prefix={prefix} />
				</Combobox>
			</ReadyReveal>
		</div>
	)
}
