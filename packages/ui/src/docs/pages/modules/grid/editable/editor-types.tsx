import { useMemo } from 'react'
import { Badge } from 'ui/badge'
import { CurrencyInput } from 'ui/currency-input'
import { DatePicker } from 'ui/date-picker'
import { Grid, type GridColumn, type GridEditCellContext } from 'ui/grid'
import { useFormat } from 'ui/providers/locale'
import { CellListbox, EditHelp } from './people.tsx'

type Task = {
	id: number
	title: string
	status: string
	due: string
	done: boolean
	budget: number
}

const tasks: Task[] = [
	{
		id: 1,
		title: 'Fix login redirect',
		status: 'in-progress',
		due: '2026-01-15',
		done: false,
		budget: 1200,
	},
	{ id: 2, title: 'Add dark mode', status: 'todo', due: '2026-03-01', done: false, budget: 800 },
	{ id: 3, title: 'Write API docs', status: 'done', due: '2026-02-10', done: true, budget: 500 },
]

const statusOptions = [
	{ label: 'Todo', value: 'todo' },
	{ label: 'In progress', value: 'in-progress' },
	{ label: 'Done', value: 'done' },
]

function isoToDate(iso: string): Date | undefined {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)

	return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined
}

function dateToIso(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0')

	const day = String(date.getDate()).padStart(2, '0')

	return `${date.getFullYear()}-${month}-${day}`
}

// A date editor: a typed DatePicker that stages an ISO date.
function CellDate({ value, onValueUpdate, ariaLabel }: GridEditCellContext<unknown>) {
	return (
		<DatePicker
			input
			format="YYYY-MM-DD"
			aria-label={ariaLabel}
			value={typeof value === 'string' ? isoToDate(value) : undefined}
			onValueChange={(date) => onValueUpdate(date ? dateToIso(date) : '')}
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
	const money = useFormat({ type: 'currency' })

	// Each row stays in edit mode, so each editor shows at once, and no row saves.
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
			{ id: 'due', title: 'Due', field: 'due', cell: (row) => row.due, editCell: CellDate },
			{
				id: 'budget',
				title: 'Budget',
				field: 'budget',
				cell: (row) => money(row.budget),
				editCell: CellCurrency,
			},
			{
				id: 'done',
				title: 'Done',
				field: 'done',
				cell: (row) => <Badge color={row.done ? 'green' : 'zinc'}>{row.done ? 'Yes' : 'No'}</Badge>,
			},
		],
		[money],
	)

	return (
		<>
			<EditHelp label="Editor types help">
				Title is a text cell and Done a yes/no listbox, from the type of the value. Status, Due, and
				Budget edit through listbox, date-picker, and currency slots.
			</EditHelp>
			<Grid
				columns={columns}
				rows={tasks}
				getKey={(row) => row.id}
				editable={{ rows: editing, onCommit: () => {} }}
			/>
		</>
	)
}
