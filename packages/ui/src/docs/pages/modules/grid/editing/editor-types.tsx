import { useMemo } from 'react'
import { Badge } from 'ui/badge'
import { CurrencyInput } from 'ui/currency-input'
import { DatePicker } from 'ui/date-picker'
import { Grid, type GridColumn, type GridEditCellContext } from 'ui/grid'
import { useIntl } from 'ui/primitives/intl'
import { CellListbox } from './people.tsx'

type Task = {
	id: number
	title: string
	status: string
	due: Date
	done: boolean
	budget: number
}

const tasks: Task[] = [
	{
		id: 1,
		title: 'Fix login redirect',
		status: 'in-progress',
		due: new Date(2026, 0, 15),
		done: false,
		budget: 1200,
	},
	{
		id: 2,
		title: 'Add dark mode',
		status: 'todo',
		due: new Date(2026, 2, 1),
		done: false,
		budget: 800,
	},
	{
		id: 3,
		title: 'Write API docs',
		status: 'done',
		due: new Date(2026, 1, 10),
		done: true,
		budget: 500,
	},
]

const statusOptions = [
	{ label: 'To do', value: 'todo' },
	{ label: 'In progress', value: 'in-progress' },
	{ label: 'Done', value: 'done' },
]

// A date editor: a typed DatePicker that stages a date.
function CellDate({ value, onValueUpdate, ariaLabel }: GridEditCellContext<unknown>) {
	return (
		<DatePicker
			input
			format="YYYY-MM-DD"
			aria-label={ariaLabel}
			value={value instanceof Date ? value : undefined}
			onValueChange={(date) => onValueUpdate(date ?? undefined)}
		/>
	)
}

// A currency editor that stages a number.
function CellCurrency({ value, onValueUpdate, ariaLabel }: GridEditCellContext<unknown>) {
	return (
		<CurrencyInput
			aria-label={ariaLabel}
			value={typeof value === 'number' ? value : null}
			onValueChange={(next) => onValueUpdate(next ?? undefined)}
		/>
	)
}

export default function EditorTypes() {
	const intl = useIntl()

	// Each row stays in edit mode, so each editor shows at once, and no row saves.
	// Title gets a text editor and Done a yes or no listbox, from the type of the
	// value. Status, Due, and Budget get an editor through the `editCell` slot.
	// `sheet: false` keeps the editors in the cells on a phone too.
	const editing = useMemo(() => new Set<string | number>(tasks.map((task) => task.id)), [])

	const columns = useMemo(
		(): GridColumn<Task>[] => [
			{ id: 'title', title: 'Title', field: 'title', cell: (row) => row.title, width: '200px' },
			{
				id: 'status',
				title: 'Status',
				field: 'status',
				cell: (row) =>
					statusOptions.find((option) => option.value === row.status)?.label ?? row.status,
				editCell: (context) => (
					<CellListbox
						value={String(context.value ?? '')}
						options={statusOptions}
						onValueUpdate={context.onValueUpdate}
						ariaLabel={context.ariaLabel}
					/>
				),
			},
			{
				id: 'due',
				title: 'Due',
				field: 'due',
				cell: (row) => intl.formatDate(row.due, { dateStyle: 'medium' }),
				editCell: CellDate,
			},
			{
				id: 'budget',
				title: 'Budget',
				field: 'budget',
				cell: (row) => intl.formatNumber(row.budget, { style: 'currency', currency: 'USD' }),
				editCell: CellCurrency,
			},
			{
				id: 'done',
				title: 'Done',
				field: 'done',
				cell: (row) => <Badge color={row.done ? 'green' : 'zinc'}>{row.done ? 'Yes' : 'No'}</Badge>,
			},
		],
		[intl],
	)

	return (
		<Grid
			columns={columns}
			rows={tasks}
			getKey={(row) => row.id}
			editable={{ rows: editing, overlay: false, onCommit: () => {} }}
		/>
	)
}
