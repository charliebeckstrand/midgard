import { useState } from 'react'
import { AddressInput, type AddressProvider, type AddressSuggestion } from 'ui/address-input'
import { Field, Label } from 'ui/fieldset'
import { places } from './places.ts'

const searchPlaces: AddressProvider = async (query) => {
	const text = query.toLowerCase()

	return places.filter(
		(place) =>
			place.label.toLowerCase().includes(text) || place.description?.toLowerCase().includes(text),
	)
}

export default function CustomProvider() {
	const [address, setAddress] = useState<AddressSuggestion | null>(null)

	return (
		<Field>
			<Label>Address</Label>
			<AddressInput
				value={address}
				onValueChange={setAddress}
				provider={searchPlaces}
				minQueryLength={1}
				debounceMs={0}
				placeholder="Try 'baker' or 'london'"
			/>
		</Field>
	)
}
