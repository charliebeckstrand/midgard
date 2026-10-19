import type { AddressProvider, AddressSuggestion } from 'ui/address-input'

export const madrid: AddressSuggestion = {
	id: 'calle-del-prado',
	label: 'Calle del Prado 18',
	description: 'Madrid, Spain',
	latitude: 40.414,
	longitude: -3.698,
}

export const places: AddressSuggestion[] = [
	{
		id: 'orchard-lane',
		label: '410 Orchard Lane',
		description: 'Mountain View, CA, USA',
		latitude: 37.394,
		longitude: -122.079,
	},
	{
		id: 'linden-avenue',
		label: '75 Linden Avenue',
		description: 'New York, NY, USA',
		latitude: 40.741,
		longitude: -73.989,
	},
	{
		id: 'baker-street',
		label: '18 Baker Street',
		description: 'London, UK',
		latitude: 51.519,
		longitude: -0.157,
	},
	{
		id: 'elm-row',
		label: '6 Elm Row',
		description: 'London, UK',
		latitude: 51.512,
		longitude: -0.132,
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
