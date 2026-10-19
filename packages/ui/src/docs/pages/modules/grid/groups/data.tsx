import type { GridColumn, GridColumnGroup } from 'ui/grid'
import { MoneyText } from '../data.tsx'

// Each group bands a run of columns under a colored header.
export const columnGroups: GridColumnGroup[] = [
	{ id: 'contact', title: 'Contact', color: 'blue', columns: ['name', 'email'] },
	{ id: 'org', title: 'Organization', color: 'violet', columns: ['role', 'status'] },
]

export type Sale = { id: number; region: string; rep: string; units: number; revenue: number }

export const sales: Sale[] = [
	{ id: 1, region: 'West', rep: 'Wade Cooper', units: 12, revenue: 1440 },
	{ id: 2, region: 'West', rep: 'Tanya Fox', units: 30, revenue: 4200 },
	{ id: 3, region: 'East', rep: 'Devon Webb', units: 22, revenue: 2860 },
	{ id: 4, region: 'East', rep: 'Arlene McCoy', units: 41, revenue: 5330 },
	{ id: 5, region: 'West', rep: 'Tom Cook', units: 18, revenue: 2160 },
	{ id: 6, region: 'East', rep: 'Ravi Shah', units: 9, revenue: 1170 },
]

// An `aggFunc` gives the value of a column on a group header and on a total
// row. Units and revenue add up. The price of a unit is a function of the
// rows, as it reads two fields.
export const salesColumns: GridColumn<Sale>[] = [
	{ id: 'region', title: 'Region', cell: (row) => row.region, value: (row) => row.region },
	{ id: 'rep', title: 'Rep', cell: (row) => row.rep, value: (row) => row.rep },
	{
		id: 'units',
		title: 'Units',
		cell: (row) => String(row.units),
		value: (row) => row.units,
		aggFunc: 'sum',
	},
	{
		id: 'revenue',
		title: 'Revenue',
		cell: (row) => <MoneyText amount={row.revenue} />,
		value: (row) => row.revenue,
		aggFunc: 'sum',
		aggCell: ({ value }) => <MoneyText amount={Number(value)} />,
	},
	{
		id: 'perUnit',
		title: 'Unit price',
		cell: (row) => <MoneyText amount={row.revenue / row.units} />,
		value: (row) => row.revenue / row.units,
		aggFunc: (rows: Sale[]) => {
			const revenue = rows.reduce((sum, row) => sum + row.revenue, 0)

			const units = rows.reduce((sum, row) => sum + row.units, 0)

			return units === 0 ? null : revenue / units
		},
		aggCell: ({ value }) => (value === null ? '' : <MoneyText amount={Number(value)} />),
	},
]
