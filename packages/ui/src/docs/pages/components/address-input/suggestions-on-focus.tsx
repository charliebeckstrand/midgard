import { useState } from 'react'
import { AddressInput, type AddressSuggestion } from 'ui/address-input'
import { Field, Label } from 'ui/fieldset'
import { searchPlaces } from './places.ts'

export default function SuggestionsOnFocus() {
	const [address, setAddress] = useState<AddressSuggestion | null>(null)

	return (
		<Field>
			<Label>Address</Label>
			<AddressInput
				value={address}
				onValueChange={setAddress}
				provider={searchPlaces}
				minQueryLength={0}
			/>
		</Field>
	)
}
