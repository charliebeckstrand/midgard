import { names } from '../../../kit/proper-names.ts'

/** The customers of the loads. */
const customers = names({
	acme: 'Acme Freight',
	northwind: 'Northwind',
	globex: 'Globex',
	initech: 'Initech',
	umbrella: 'Umbrella',
})

/** A load on the board. The weight is in pounds. */
export type Load = { id: string; code: string; customer: string; weight: number }

export type Column = { id: string; title: string; items: Load[] }

export const columns: Column[] = [
	{
		id: 'booked',
		title: 'Booked',
		items: [
			{ id: 'l-1001', code: 'LD-1001', customer: customers.acme, weight: 28_400 },
			{ id: 'l-1002', code: 'LD-1002', customer: customers.northwind, weight: 14_100 },
		],
	},
	{
		id: 'assigned',
		title: 'Assigned',
		items: [{ id: 'l-1003', code: 'LD-1003', customer: customers.globex, weight: 32_000 }],
	},
	{
		id: 'in-transit',
		title: 'In transit',
		items: [
			{ id: 'l-1004', code: 'LD-1004', customer: customers.initech, weight: 19_750 },
			{ id: 'l-1005', code: 'LD-1005', customer: customers.umbrella, weight: 41_200 },
		],
	},
	{
		id: 'delivered',
		title: 'Delivered',
		items: [],
	},
]

// The code of a load is the same in each language.
names(columns.flatMap(({ items }) => items.map(({ code }) => code)))
