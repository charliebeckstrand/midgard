import { useState } from 'react'
import { AddressInput, type AddressSuggestion, createPhotonProvider } from 'ui/address-input'
import { Field, Label } from 'ui/fieldset'
import { Text } from 'ui/text'

const coastalPlaces = createPhotonProvider({
	bias: { latitude: 44.64, longitude: -124.05 },
	limit: 6,
})

export default function BusinessSearch() {
	const [place, setPlace] = useState<AddressSuggestion | null>(null)

	return (
		<>
			<Field>
				<Label>Place</Label>
				<AddressInput
					value={place}
					onValueChange={setPlace}
					provider={coastalPlaces}
					placeholder="Try 'Clearwater' or 'Mo's'"
				/>
			</Field>
			{place ? (
				<Text>
					{[place.name, place.address?.city, place.address?.state].filter(Boolean).join(' · ')}
				</Text>
			) : null}
		</>
	)
}
