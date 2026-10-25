import { Grid, type GridColumn } from 'ui/grid'
import { type InvoiceStatus, invoiceStatuses } from '../../../../data/commerce.ts'
import { type Invoice, invoices } from './invoices.ts'

const statusOrder: Record<InvoiceStatus, number> = { paid: 0, due: 1 }

const invoiceColumns: GridColumn<Invoice>[] = [
	// The numbers in a reference sort as numbers: INV-1, INV-2, INV-10.
	{ id: 'ref', title: 'Reference', cell: (row) => row.ref, value: (row) => row.ref },
	// An amount of money sorts by its value.
	{ id: 'amount', title: 'Amount', cell: (row) => row.amount, value: (row) => row.amount },
	// A `sortFn` sets the order of a column.
	{
		id: 'status',
		title: 'Status',
		cell: (row) => invoiceStatuses[row.status],
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
