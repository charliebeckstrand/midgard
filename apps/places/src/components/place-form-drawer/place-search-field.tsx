'use client'

import { AddressInput, type AddressSuggestion } from 'ui/address-input'
import { Field, Label, Message } from 'ui/fieldset'
import { useFormActions } from 'ui/form'
import { addressLine } from './location-form'
import { placeGeocoder } from './place-geocoder'
import { useNameFill } from './use-name-fill'

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
 * position is. The name is different: {@link useNameFill} writes it only over a
 * name that the reader did not type.
 */
export function PlaceSearchField() {
	const actions = useFormActions()

	const fillName = useNameFill()

	function fill(place: AddressSuggestion | null) {
		if (place === null) return

		actions?.setValue('address', addressLine(place))

		if (place.latitude !== undefined && place.longitude !== undefined) {
			actions?.setValue('latitude', String(place.latitude))

			actions?.setValue('longitude', String(place.longitude))
		}

		fillName(place)
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
