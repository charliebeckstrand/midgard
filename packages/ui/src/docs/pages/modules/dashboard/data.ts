import type { QueryField } from 'ui/query'

export type Sale = {
	id: number
	month: string
	region: string
	product: string
	revenue: number
	units: number
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

const regions = ['North', 'South', 'East', 'West']

/** Each product, in palette order, so a filter never moves the color of a product. */
export const products = ['Tea', 'Coffee', 'Cocoa']

export const sales: Sale[] = months.flatMap((month, m) =>
	regions.flatMap((region, r) =>
		products.map((product, p) => {
			const units = 20 + ((m * 7 + r * 11 + p * 5) % 23)

			return {
				id: m * 100 + r * 10 + p,
				month,
				region,
				product,
				units,
				revenue: units * (8 + p * 3 + r),
			}
		}),
	),
)

export const fields: QueryField[] = [
	{
		name: 'region',
		label: 'Region',
		type: 'select',
		options: regions.map((value) => ({ value, label: value })),
	},
	{
		name: 'product',
		label: 'Product',
		type: 'select',
		options: products.map((value) => ({ value, label: value })),
	},
	{ name: 'revenue', label: 'Revenue', type: 'number' },
]

export function sumBy<K extends keyof Sale>(
	rows: readonly Sale[],
	key: K,
	value: 'revenue' | 'units',
): { key: Sale[K]; total: number }[] {
	const totals = new Map<Sale[K], number>()

	for (const row of rows) totals.set(row[key], (totals.get(row[key]) ?? 0) + row[value])

	return [...totals].map(([group, total]) => ({ key: group, total }))
}
