import type { JsonValue } from 'ui/json-tree'

export const sample: JsonValue = {
	id: 42,
	name: 'Ada Lovelace',
	active: true,
	meta: null,
	tags: ['engineer', 'mathematician'],
	address: {
		city: 'London',
		zip: 'WC2N',
		geo: { lat: 51.507, lng: -0.127 },
	},
	orders: [
		{ id: 1, total: 19.99, shipped: true },
		{ id: 2, total: 7.5, shipped: false },
	],
}
