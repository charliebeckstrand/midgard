import { useEffect, useState } from 'react'
import { Stack } from '../../../../components/stack'
import { Grid, type GridColumn, type SortState } from '../../../../modules/grid'
import { code, Example } from '../../../engine'
import { clientSortColumns, type Person, people, sortableColumns } from './_data'

// Sort `people` by the ordered sort list — the work a backend does for a
// server-side (manual) sort, walking the list in priority order.
function sortPeople(sort: SortState[]): Person[] {
	if (!sort.length) return people

	return [...people].sort((a, b) => {
		for (const { column, direction } of sort) {
			const key = column as keyof Person

			const dir = direction === 'asc' ? 1 : -1

			if (a[key] < b[key]) return -dir

			if (a[key] > b[key]) return dir
		}

		return 0
	})
}

function SortableExample() {
	const [sort, setSort] = useState<SortState[]>([{ column: 'name', direction: 'asc' }])

	// Server-side (manual) sorting: the grid emits the sort change and leaves the
	// row order untouched; the consumer fetches the reordered rows. The timeout
	// stands in for that round trip — while it's in flight the grid pulses the
	// current rows at a reduced opacity, clearing when the reordered page lands. The
	// sort is an ordered list — Shift-click a header to add columns.
	const [rows, setRows] = useState<Person[]>(() => sortPeople(sort))

	useEffect(() => {
		const id = setTimeout(() => setRows(sortPeople(sort)), 600)

		return () => clearTimeout(id)
	}, [sort])

	return (
		<Grid
			columns={sortableColumns}
			rows={rows}
			getKey={(row) => row.id}
			sort={{ value: sort, onValueChange: setSort, manual: true }}
		/>
	)
}

function ClientSortExample() {
	const [sort, setSort] = useState<SortState[]>([{ column: 'name', direction: 'asc' }])

	// Client-side is the default: the grid sorts `people` itself by each column's
	// value (here an explicit `value`; columns without one sort by their field).
	// Shift-click a second header to sort by it too — the engine orders by the
	// whole list, and a priority badge appears on each sorted header.
	return (
		<Grid
			columns={clientSortColumns}
			rows={people}
			getKey={(row) => row.id}
			sort={{ value: sort, onValueChange: setSort }}
		/>
	)
}

function AnimatedSortExample() {
	const [sort, setSort] = useState<SortState[]>([{ column: 'name', direction: 'asc' }])

	// `sort.animate` turns each re-sort into a Framer `layout` FLIP: click a header
	// (or Shift-click a second) and the rows glide from their old places to their
	// new ones instead of snapping. Plain-body only — it stands down under
	// `virtualize` and grouping — and honors `prefers-reduced-motion`.
	return (
		<Grid
			columns={clientSortColumns}
			rows={people}
			getKey={(row) => row.id}
			sort={{ value: sort, onValueChange: setSort, animate: true }}
		/>
	)
}

function MultiSortExample() {
	// Seeded with a two-column sort (Role, then Name) so the priority badges show
	// at a glance; Shift-click any sortable header to extend or reorder the sort.
	const [sort, setSort] = useState<SortState[]>([
		{ column: 'role', direction: 'asc' },
		{ column: 'name', direction: 'asc' },
	])

	return (
		<Grid
			columns={clientSortColumns}
			rows={people}
			getKey={(row) => row.id}
			sort={{ value: sort, onValueChange: setSort }}
		/>
	)
}

type Invoice = { id: number; ref: string; amount: string; status: 'paid' | 'due' }

const invoices: Invoice[] = [
	{ id: 1, ref: 'INV-2', amount: '$1,200.00', status: 'due' },
	{ id: 2, ref: 'INV-10', amount: '$90.50', status: 'paid' },
	{ id: 3, ref: 'INV-1', amount: '$340.00', status: 'due' },
]

const statusOrder: Record<Invoice['status'], number> = { paid: 0, due: 1 }

const invoiceColumns: GridColumn<Invoice>[] = [
	// Natural order: INV-1, INV-2, INV-10 (not INV-1, INV-10, INV-2).
	{ id: 'ref', title: 'Reference', cell: (row) => row.ref, value: (row) => row.ref },
	// Money sorts by amount, not by the leading digit of "$1,200.00".
	{ id: 'amount', title: 'Amount', cell: (row) => row.amount, value: (row) => row.amount },
	// A manual client-side comparator overrides the smart default.
	{
		id: 'status',
		title: 'Status',
		cell: (row) => row.status,
		value: (row) => row.status,
		sortFn: (a, b) => statusOrder[a.status] - statusOrder[b.status],
	},
]

const SmartSortExample = () => (
	// Smart by default: money, comma-grouped numbers, and numbers inside strings
	// sort correctly; the Status column supplies its own `sortFn`.
	<Grid
		columns={invoiceColumns}
		rows={invoices}
		getKey={(row) => row.id}
		sort={{ defaultValue: [{ column: 'amount', direction: 'asc' }] }}
	/>
)

export function Demo() {
	return (
		<Stack gap="xl">
			<Example
				title="Server-side sorting"
				code={code`<Grid sort={{ value, onValueChange, manual: true }} />`}
			>
				<SortableExample />
			</Example>

			<Example title="Client sorting" code={code`<Grid sort={{ value, onValueChange }} />`}>
				<ClientSortExample />
			</Example>

			<Example
				title="Animated sorting"
				code={code`<Grid sort={{ value, onValueChange, animate: true }} />`}
			>
				<AnimatedSortExample />
			</Example>

			<Example
				title="Multi-column sort"
				code={code`<Grid sort={{ value: [{ column, direction }, ...] }} />`}
			>
				<MultiSortExample />
			</Example>

			<Example
				title="Smart sorting"
				code={code`<Grid columns={[{ ...col, sortFn: (a, b) => ... }]} />`}
			>
				<SmartSortExample />
			</Example>
		</Stack>
	)
}
