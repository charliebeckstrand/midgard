'use client'

import { useRef } from 'react'
import { AddressInput, type AddressSuggestion } from 'ui/address-input'
import { Field, Label, Message } from 'ui/fieldset'
import { useFormActions } from 'ui/form'
import { addressLine } from './place-form'
import { placeGeocoder } from './place-geocoder'

/**
 * The search field: one control that fills five of the form's fields.
 *
 * `place` is its own, bound by name. A pick also writes `name`, `address`,
 * `latitude`, and `longitude` through the form's actions. That is the
 * sanctioned way to write a field that a control does not own, and it keeps
 * this component off the re-render path of that field.
 *
 * A pick always writes the address and the coordinates, because they and the
 * match must agree: the match is the position, and the address says where that
 * position is. The name is different. The name the reader searched for is the
 * name they mean, so a pick writes it, but it leaves a name the reader typed. It
 * replaces a name that an earlier pick wrote, so picking the wrong business and
 * then the right one ends with the right name. A plain address names nothing, so
 * a pick of one leaves the name alone.
 */
export function PlaceSearchField() {
	const actions = useFormActions()

	// The last name this field wrote. It is what parts a name the reader typed —
	// which a second pick must leave alone — from one an earlier pick wrote, which
	// a second pick must replace. It cannot be derived from the selection: a clear
	// drops the place and leaves the name behind.
	const filled = useRef<string | null>(null)

	function fill(place: AddressSuggestion | null) {
		if (place === null) return

		actions?.setValue('address', addressLine(place))

		if (place.latitude !== undefined && place.longitude !== undefined) {
			actions?.setValue('latitude', String(place.latitude))

			actions?.setValue('longitude', String(place.longitude))
		}

		if (place.name === undefined) return

		const named = String(actions?.getValue('name') ?? '').trim()

		if (named !== '' && named !== filled.current) return

		filled.current = place.name

		actions?.setValue('name', place.name)
	}

	return (
		<Field>
			<Label>Search</Label>

			<AddressInput
				name="place"
				provider={placeGeocoder}
				onValueChange={fill}
				placeholder="Clearwater Restaurant"
			/>

			<Message name="place" />
		</Field>
	)
}
