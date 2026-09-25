import type { QueryField } from '../../../../modules/query'

/** One sale: the rows that each tile of the demo reads through the filter scope. */
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

/** Every product, in palette order, so a filter never moves a product's color. */
export const products = ['Tea', 'Coffee', 'Cocoa']

/** A deterministic set of sales, so the demo renders the same on each load. */
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

/** The fields that the filter can name. */
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

/** Sums `value` over the rows for each distinct `key`, in first-seen order. */
export function sumBy<K extends keyof Sale>(
	rows: readonly Sale[],
	key: K,
	value: 'revenue' | 'units',
): { key: Sale[K]; total: number }[] {
	const totals = new Map<Sale[K], number>()

	for (const row of rows) totals.set(row[key], (totals.get(row[key]) ?? 0) + row[value])

	return [...totals].map(([group, total]) => ({ key: group, total }))
}
