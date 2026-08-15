'use client'

import { useRef } from 'react'
import { AddressInput, type AddressSuggestion, createPhotonProvider } from 'ui/address-input'
import { Field, Label, Message } from 'ui/fieldset'
import { useFormActions } from 'ui/form'

/**
 * The geocoder. Photon ranks by prominence and returns businesses beside plain
 * addresses, so a name typed here resolves to the business that carries it.
 */
const provider = createPhotonProvider({ limit: 8 })

/**
 * The search field: one control that fills two of the form's fields.
 *
 * `place` is its own, bound by name. A pick also writes `name` — the name the
 * reader searched for is the name they mean — through the form's actions, which
 * is the sanctioned way to write a field a control does not own and keeps this
 * component off that field's re-render path.
 *
 * It leaves a name the reader typed and replaces one an earlier pick wrote, so
 * picking the wrong business and then the right one ends with the right name.
 */
export function PlaceSearchField() {
	const actions = useFormActions()

	// The last name this field wrote. It is what parts a name the reader typed —
	// which a second pick must leave alone — from one an earlier pick wrote, which
	// a second pick must replace. It cannot be derived from the selection: a clear
	// drops the place and leaves the name behind.
	const filled = useRef<string | null>(null)

	function fillName(place: AddressSuggestion | null) {
		if (place === null) return

		const named = String(actions?.getValue('name') ?? '').trim()

		if (named !== '' && named !== filled.current) return

		const name = place.name ?? place.label

		filled.current = name

		actions?.setValue('name', name)
	}

	return (
		<Field>
			<Label>Search</Label>

			<AddressInput
				name="place"
				provider={provider}
				onValueChange={fillName}
				placeholder="Clearwater Restaurant"
			/>

			<Message name="place" />
		</Field>
	)
}
