'use client'

import { useState } from 'react'
import {
	AddressInput,
	type AddressProvider,
	type AddressSuggestion,
} from '../../components/address-input'
import { Field, Label } from '../../components/fieldset'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Inputs' }

const mockGooglePlaces: AddressProvider = async (query) => {
	const places = [
		{ label: '1600 Amphitheatre Parkway', description: 'Mountain View, CA, USA' },
		{ label: '1 Infinite Loop', description: 'Cupertino, CA, USA' },
		{ label: '350 5th Ave', description: 'New York, NY, USA' },
		{ label: '221B Baker Street', description: 'London, UK' },
		{ label: '10 Downing Street', description: 'London, UK' },
	]

	const q = query.toLowerCase()

	return places
		.filter((p) => p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
		.map((p, i) => ({ id: `mock-${i}`, ...p }))
}

function Default() {
	const [address, setAddress] = useState<AddressSuggestion | undefined>(undefined)

	return (
		<Sizer>
			<Field>
				<Label>Address</Label>
				<AddressInput value={address} onChange={setAddress} />
				{address?.latitude != null ? (
					<Text>
						{address.latitude.toFixed(4)}, {address.longitude?.toFixed(4)}
					</Text>
				) : null}
			</Field>
		</Sizer>
	)
}

function CustomProvider() {
	const [address, setAddress] = useState<AddressSuggestion | undefined>(undefined)

	return (
		<Sizer>
			<Field>
				<Label>Address (mock provider)</Label>
				<AddressInput
					value={address}
					onChange={setAddress}
					provider={mockGooglePlaces}
					minQueryLength={1}
					placeholder="Try 'amph' or 'baker'"
				/>
			</Field>
		</Sizer>
	)
}

export default function AddressInputDemo() {
	return (
		<Stack gap={6}>
			<Example
				title="Default (Photon)"
				code={code`
					import { AddressInput, type AddressSuggestion } from 'ui/address-input'
					import { Field, Label } from 'ui/fieldset'

					const [address, setAddress] = useState<AddressSuggestion | undefined>()

					<Field>
						<Label>Address</Label>
						<AddressInput value={address} onChange={setAddress} />
					</Field>
				`}
			>
				<Default />
			</Example>

			<Example
				title="Custom provider"
				code={code`
					import { AddressInput, type AddressProvider } from 'ui/address-input'

					const googlePlaces: AddressProvider = async (query, { signal }) => {
						const response = await fetch(\`/api/places?q=\${query}\`, { signal })
						const data = await response.json()

						return data.predictions.map((p) => ({
							id: p.place_id,
							label: p.structured_formatting.main_text,
							description: p.structured_formatting.secondary_text,
						}))
					}

					<AddressInput provider={googlePlaces} />
				`}
			>
				<CustomProvider />
			</Example>
		</Stack>
	)
}
