import type { JsonValue } from 'ui/json-tree'

export const sample: JsonValue = {
	id: 42,
	name: 'Mia Chen',
	active: true,
	meta: null,
	tags: ['engineer', 'manager'],
	address: {
		city: 'Riverton',
		zip: '10042',
		geo: { lat: 51.507, lng: -0.127 },
	},
	orders: [
		{ id: 1, total: 19.99, shipped: true },
		{ id: 2, total: 7.5, shipped: false },
	],
}
