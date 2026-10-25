import type { QueryField } from 'ui/query'
import { products as productWords, regions as regionWords } from '../../../data/commerce.ts'

export type Sale = {
	id: number
	month: string
	region: string
	product: string
	revenue: number
	units: number
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

const regions = Object.values(regionWords)

export const products = Object.values(productWords)

export const sales: Sale[] = months.flatMap((month, monthIndex) =>
	regions.flatMap((region, regionIndex) =>
		products.map((product, productIndex) => {
			const units = 20 + ((monthIndex * 7 + regionIndex * 11 + productIndex * 5) % 23)

			return {
				id: monthIndex * 100 + regionIndex * 10 + productIndex,
				month,
				region,
				product,
				units,
				revenue: units * (8 + productIndex * 3 + regionIndex),
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
