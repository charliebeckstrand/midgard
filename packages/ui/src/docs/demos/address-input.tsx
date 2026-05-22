'use client'

import { useState } from 'react'
import {
	AddressInput,
	type AddressProvider,
	type AddressSuggestion,
} from '../../components/address-input'
import { Alert } from '../../components/alert'
import { Field, Label } from '../../components/fieldset'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Input' }

const places = [
	{
		id: '1',
		label: '1600 Amphitheatre Parkway',
		description: 'Mountain View, CA, USA',
		latitude: 37.422,
		longitude: -122.084,
	},
	{
		id: '2',
		label: '1 Infinite Loop',
		description: 'Cupertino, CA, USA',
		latitude: 37.331,
		longitude: -122.031,
	},
	{
		id: '3',
		label: '350 5th Ave',
		description: 'New York, NY, USA',
		latitude: 40.748,
		longitude: -73.985,
	},
	{
		id: '4',
		label: '221B Baker Street',
		description: 'London, UK',
		latitude: 51.523,
		longitude: -0.158,
	},
	{
		id: '5',
		label: '10 Downing Street',
		description: 'London, UK',
		latitude: 51.503,
		longitude: -0.127,
	},
]

const mockGooglePlaces: AddressProvider = async (query) => {
	const q = query.toLowerCase()

	return places.filter(
		(p) => p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
	)
}

function DefaultExample() {
	const [address, setAddress] = useState<AddressSuggestion | undefined>(undefined)

	return (
		<Field>
			<Label>Address</Label>
			<AddressInput value={address} onValueChange={setAddress} />
			{address?.latitude != null ? (
				<Text>
					{address.latitude.toFixed(4)}, {address.longitude?.toFixed(4)}
				</Text>
			) : null}
		</Field>
	)
}

function WithInitialOptionsExample() {
	const [address, setAddress] = useState<AddressSuggestion | undefined>(undefined)

	return (
		<Field>
			<Label>Address</Label>
			<AddressInput
				value={address}
				onValueChange={setAddress}
				minQueryLength={0}
				provider={async (query) => {
					const q = query.toLowerCase()

					return places.filter(
						(p) => p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
					)
				}}
			/>
			{address?.latitude != null ? (
				<Text>
					{address.latitude.toFixed(4)}, {address.longitude?.toFixed(4)}
				</Text>
			) : null}
		</Field>
	)
}

function CustomProviderExample() {
	const [address, setAddress] = useState<AddressSuggestion | undefined>(undefined)

	return (
		<Field>
			<Label>Address</Label>
			<AddressInput
				value={address}
				onValueChange={setAddress}
				provider={mockGooglePlaces}
				minQueryLength={1}
				placeholder="Try 'amph' or 'baker'"
			/>
			{address?.latitude != null ? (
				<Text>
					{address.latitude.toFixed(4)}, {address.longitude?.toFixed(4)}
				</Text>
			) : null}
		</Field>
	)
}

export function Demo() {
	return (
		<>
			<Alert severity="info" closable>
				<Text>
					AddressInput uses the{' '}
					<a
						href="https://photon.komoot.io/"
						target="_blank"
						rel="noopener noreferrer"
						className="hover:underline underline:offset-4"
					>
						Photon geocoding API
					</a>{' '}
					by default, however, you can use any provider that matches the{' '}
					<code>AddressProvider</code> interface, such as Google Places.
				</Text>
			</Alert>

			<Example title="Default">
				<DefaultExample />
			</Example>

			<Example title="With initial options">
				<WithInitialOptionsExample />
			</Example>

			<Example title="Custom provider">
				<CustomProviderExample />
			</Example>
		</>
	)
}
