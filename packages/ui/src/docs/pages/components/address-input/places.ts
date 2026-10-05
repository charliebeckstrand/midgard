import type { AddressProvider, AddressSuggestion } from 'ui/address-input'

export const madrid: AddressSuggestion = {
	id: 'alcala',
	label: 'calle de Alcalá 42',
	description: 'Madrid, Spain',
	latitude: 40.418,
	longitude: -3.697,
}

export const places: AddressSuggestion[] = [
	{
		id: 'amphitheatre',
		label: '1600 Amphitheatre Parkway',
		description: 'Mountain View, CA, USA',
		latitude: 37.422,
		longitude: -122.084,
	},
	{
		id: 'fifth-avenue',
		label: '350 5th Ave',
		description: 'New York, NY, USA',
		latitude: 40.748,
		longitude: -73.985,
	},
	{
		id: 'baker-street',
		label: '221B Baker Street',
		description: 'London, UK',
		latitude: 51.523,
		longitude: -0.158,
	},
	{
		id: 'downing-street',
		label: '10 Downing Street',
		description: 'London, UK',
		latitude: 51.503,
		longitude: -0.127,
	},
	madrid,
]

export const searchPlaces: AddressProvider = async (query) => {
	const text = query.toLowerCase()

	return places.filter(
		(place) =>
			place.label.toLowerCase().includes(text) || place.description?.toLowerCase().includes(text),
	)
}
