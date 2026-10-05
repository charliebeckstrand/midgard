import { useState } from 'react'
import { AddressInput, type AddressSuggestion } from 'ui/address-input'
import { Field, Label } from 'ui/fieldset'
import { Text } from 'ui/text'
import { searchPlaces } from './places.ts'

export default function Coordinates() {
	const [address, setAddress] = useState<AddressSuggestion | null>(null)

	return (
		<>
			<Field>
				<Label>Address</Label>
				<AddressInput value={address} onValueChange={setAddress} provider={searchPlaces} />
			</Field>
			{address?.latitude != null && address.longitude != null ? (
				<Text>
					{address.latitude.toFixed(4)}, {address.longitude.toFixed(4)}
				</Text>
			) : null}
		</>
	)
}
