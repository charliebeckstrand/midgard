'use client'

import { Crosshair, MapPin } from 'lucide-react'
import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { useFormActions, useFormValue } from 'ui/form'
import { Icon } from 'ui/icon'
import { Input } from 'ui/input'
import { Columns } from 'ui/structure/columns'
import { Stack } from 'ui/structure/stack'
import type { LocateBy } from './location-form'

/**
 * The address field. A pick in the search fills it, and the reader can type it
 * for a place that the search does not find.
 *
 * An address that the reader types is the position from then on, so typing
 * clears the match in the search. A submit then finds the position from the
 * address. A match that stayed would put the place at the position of a
 * different address.
 */
function AddressInputField() {
	const actions = useFormActions()

	return (
		<Field>
			<Label>Address</Label>

			<Input
				name="address"
				autoComplete="street-address"
				placeholder="Street, city, state, zip"
				onChange={() => actions?.setValue('place', undefined)}
			/>

			<Message name="address" />
		</Field>
	)
}

/**
 * The latitude and the longitude, in decimal degrees. A pick in the search
 * fills them. The keyboard of a touch screen shows the decimal keys, and the
 * reader types the minus sign of a south latitude or a west longitude.
 */
function CoordinateFields() {
	return (
		<Columns columns={{ initial: 1, sm: 2 }} gap="xl" align="start">
			<Field>
				<Label>Latitude</Label>

				<Input name="latitude" inputMode="decimal" autoComplete="off" placeholder="45.6789" />

				<Message name="latitude" />
			</Field>

			<Field>
				<Label>Longitude</Label>

				<Input name="longitude" inputMode="decimal" autoComplete="off" placeholder="-123.4567" />

				<Message name="longitude" />
			</Field>
		</Columns>
	)
}

/**
 * Where the place is: the address, or the latitude and the longitude for a
 * place that the geocoder does not find. A button under the fields changes
 * between the two, and `locateBy` holds which one gives the position.
 *
 * The other fields keep their values while they do not show. Thus a reader can
 * type the address, change to the coordinates when the address is not found,
 * and the place keeps the typed address as its address line.
 *
 * The button stays mounted and only its words and its icon change, so the focus
 * stays on it after a press. The icon shows the fields that a press shows: the
 * pin of the address in the place drawer, or a crosshair for one exact point.
 * The button has no `size`, so it takes the density step of the reader, as the
 * other buttons of the form do.
 */
export function PlaceAddressField() {
	const { value: locateBy = 'address', setValue } = useFormValue<LocateBy>('locateBy', {})

	const coordinates = locateBy === 'coordinates'

	return (
		<Stack gap="sm">
			{coordinates ? <CoordinateFields /> : <AddressInputField />}

			<div>
				<Button
					type="button"
					variant="plain"
					prefix={<Icon icon={coordinates ? <MapPin /> : <Crosshair />} />}
					onClick={() => setValue(coordinates ? 'address' : 'coordinates')}
				>
					{coordinates ? 'Input address' : 'Input coordinates'}
				</Button>
			</div>
		</Stack>
	)
}
