import { Grid, type GridColumn } from 'ui/grid'

type Invoice = { id: number; ref: string; amount: string; status: 'paid' | 'due' }

const invoices: Invoice[] = [
	{ id: 1, ref: 'INV-2', amount: '$1,200.00', status: 'due' },
	{ id: 2, ref: 'INV-10', amount: '$90.50', status: 'paid' },
	{ id: 3, ref: 'INV-1', amount: '$340.00', status: 'due' },
]

const statusOrder: Record<Invoice['status'], number> = { paid: 0, due: 1 }

const invoiceColumns: GridColumn<Invoice>[] = [
	// The numbers in a reference sort as numbers: INV-1, INV-2, INV-10.
	{ id: 'ref', title: 'Reference', cell: (row) => row.ref, value: (row) => row.ref },
	// An amount of money sorts by its value.
	{ id: 'amount', title: 'Amount', cell: (row) => row.amount, value: (row) => row.amount },
	// A `sortFn` sets the order of a column.
	{
		id: 'status',
		title: 'Status',
		cell: (row) => row.status,
		value: (row) => row.status,
		sortFn: (a, b) => statusOrder[a.status] - statusOrder[b.status],
	},
]

export default function SmartSorting() {
	return (
		<Grid
			columns={invoiceColumns}
			rows={invoices}
			getKey={(row) => row.id}
			sort={{ defaultValue: [{ column: 'amount', direction: 'asc' }] }}
		/>
	)
}
