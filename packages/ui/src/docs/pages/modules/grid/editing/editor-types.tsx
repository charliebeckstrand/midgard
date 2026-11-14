import { useMemo } from 'react'
import { Badge } from 'ui/badge'
import { CurrencyInput } from 'ui/currency-input'
import { DatePicker } from 'ui/date-picker'
import { DateTime } from 'ui/date-time'
import { Grid, type GridColumn, type GridEditCellContext } from 'ui/grid'
import { useIntl } from 'ui/primitives/intl'
import { Textarea } from 'ui/textarea'
import { type Task, taskStatuses, tasks } from '../../../../data/tasks.ts'
import { CellListbox } from './people.tsx'

// The tasks with a yes or no field, so the Done column gets the editor of a
// boolean.
type EditedTask = Task & { done: boolean }

const rows: EditedTask[] = tasks.map((task) => ({ ...task, done: task.status === 'done' }))

// Each row stays in edit mode, so each editor shows at once, and no row saves.
// Title gets a text editor and Done a yes or no listbox, from the type of the
// value. Status, Due, Budget, and Notes get an editor through the `editCell`
// slot.
// `overlay: false` keeps the editors in the cells on a phone too.
const editing = new Set<string | number>(tasks.map((task) => task.id))

const statusOptions = Object.entries(taskStatuses).map(([value, label]) => ({ label, value }))

// A date editor: a typed DatePicker that stages a date.
function CellDate({ value, onValueUpdate, ariaLabel }: GridEditCellContext<unknown>) {
	return (
		<DatePicker
			input
			aria-label={ariaLabel}
			value={value instanceof Date ? value : undefined}
			onValueChange={(date) => onValueUpdate(date ?? undefined)}
		/>
	)
}

// A text editor for long text: a Textarea of one row that fits its height to
// its text. In the cell it shows one line. With focus, it grows past the cell,
// down and toward the end, as the text needs.
function CellNotes({ value, onValueUpdate, ariaLabel }: GridEditCellContext<unknown>) {
	return (
		<Textarea
			aria-label={ariaLabel}
			rows={1}
			autoResize
			value={typeof value === 'string' ? value : ''}
			onChange={(event) => onValueUpdate(event.target.value)}
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

	const columns = useMemo(
		(): GridColumn<EditedTask>[] => [
			{ id: 'title', title: 'Title', field: 'title', cell: (row) => row.title, width: '200px' },
			{
				id: 'status',
				title: 'Status',
				field: 'status',
				cell: (row) => taskStatuses[row.status],
				editCell: (context) => (
					<CellListbox
						value={String(context.value ?? '')}
						options={statusOptions}
						onValueUpdate={context.onValueUpdate}
						commit={context.commit}
						ariaLabel={context.ariaLabel}
						entered={context.entered}
					/>
				),
			},
			{
				id: 'due',
				title: 'Due',
				field: 'due',
				cell: (row) => <DateTime value={row.due} format={{ dateStyle: 'medium' }} />,
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
				id: 'notes',
				title: 'Notes',
				field: 'description',
				cell: (row) => row.description,
				width: '180px',
				editCell: CellNotes,
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
			rows={rows}
			getKey={(row) => row.id}
			rowLabel={(row) => row.title}
			editable={{ rows: editing, overlay: false, onCommit: () => {} }}
		/>
	)
}
