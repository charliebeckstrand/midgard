'use client'

import { Description, Field, Label, Message } from 'ui/fieldset'
import { useFormActions } from 'ui/form'
import { Input } from 'ui/input'

/**
 * The address field. A pick in the search fills it, and the reader can type it
 * for a place that the search does not find.
 *
 * An address that the reader types is the position from then on, so typing
 * clears the match in the search. A submit then finds the position from the
 * address. A match that stayed would put the place at the position of a
 * different address.
 */
export function PlaceAddressField() {
	const actions = useFormActions()

	return (
		<Field>
			<Label>Address</Label>

			<Description>
				Filled from the search. Type it if the search does not find the place.
			</Description>

			<Input
				name="address"
				autoComplete="street-address"
				placeholder="Street, city, state"
				onChange={() => actions?.setValue('place', undefined)}
			/>

			<Message name="address" />
		</Field>
	)
}
