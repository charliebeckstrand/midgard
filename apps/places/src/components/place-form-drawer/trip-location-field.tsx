'use client'

import { AddressInput } from 'ui/address-input'
import { Field, Label, Message } from 'ui/fieldset'
import { areaGeocoder } from './place-geocoder'
import { useNameFill } from './use-name-fill'

/**
 * The location of a trip: a search for a town, a city, a region, or a country.
 * The pick is the position of the trip and the name of its location, so a trip
 * needs no address. A pick also names the trip where the reader has not named
 * it ({@link useNameFill}).
 */
export function TripLocationField() {
	const fillName = useNameFill()

	return (
		<Field>
			<Label>Location</Label>

			<AddressInput
				name="location"
				provider={areaGeocoder}
				onValueChange={fillName}
				placeholder="City, region, or country"
			/>

			<Message name="location" />
		</Field>
	)
}
