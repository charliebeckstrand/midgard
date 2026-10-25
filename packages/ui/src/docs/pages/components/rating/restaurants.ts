import { names } from '../../../kit/proper-names.ts'

/** The restaurants of the read-only example, with the score of each. */
export const restaurants = [
	{ name: 'Harbor Kitchen', score: 4.8 },
	{ name: 'Blue Door Cafe', score: 4.2 },
	{ name: 'Corner Burger', score: 3.5 },
	{ name: 'Night Market Grill', score: 2.1 },
]

// The name of a restaurant is the same in each language.
names(restaurants.map(({ name }) => name))
