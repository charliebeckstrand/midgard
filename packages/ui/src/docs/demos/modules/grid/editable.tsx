import { Check, Info, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Alert } from '../../../../components/alert'
import { Badge } from '../../../../components/badge'
import { Button } from '../../../../components/button'
import { CurrencyInput } from '../../../../components/currency-input'
import { DatePicker } from '../../../../components/date-picker'
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '../../../../components/dialog'
import { Field, Label } from '../../../../components/fieldset'
import { Flex } from '../../../../components/flex'
import { Form, useFormField } from '../../../../components/form'
import { Icon } from '../../../../components/icon'
import { Listbox, ListboxLabel, ListboxOption } from '../../../../components/listbox'
import { NumberInput } from '../../../../components/number-input'
import { Stack } from '../../../../components/stack'
import { SubmitButton } from '../../../../components/submit-button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/tooltip'
import {
	type CellChange,
	Grid,
	type GridColumn,
	type GridEditCellContext,
} from '../../../../modules/grid'
import { useFormat } from '../../../../providers/locale'
import { code, Example } from '../../../engine'

// Applies committed cell changes onto the row state: each change patches one
// field on the row it keys. The grid emits these (as one batch per row) through
// `editable.onValueChange` when an editing row is saved.
function applyChanges<T extends { id: number }>(rows: T[], changes: CellChange[]): T[] {
	if (!changes.length) return rows

	const byKey = new Map<string | number, Record<string, unknown>>()

	for (const change of changes) {
		const entry = byKey.get(change.rowKey) ?? {}

		entry[change.columnId as string] = change.value

		byKey.set(change.rowKey, entry)
	}

	return rows.map((row) => {
		const patch = byKey.get(row.id)

		return patch ? ({ ...row, ...patch } as T) : row
	})
}

function EditHelp({ label, children }: { label: string; children: string }) {
	return (
		<Flex justify="end">
			<Tooltip placement="left">
				<TooltipTrigger>
					<Button variant="bare" aria-label={label}>
						<Icon icon={<Info />} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>{children}</TooltipContent>
			</Tooltip>
		</Flex>
	)
}

// Custom editors live in the column's `editCell` slot — the grid exposes no
// editor components. Each receives the cell value plus the staging callbacks; the
// row's save flushes the staged values, so the slot only stages (no per-cell
// commit), mirroring the inferred text / number / yes-no editors the grid mounts.

/** A listbox slot: stages the picked option. */
function CellListbox({
	value,
	options,
	onValueUpdate,
	ariaLabel,
}: {
	value: string
	options: { label: string; value: string }[]
	onValueUpdate: GridEditCellContext<unknown>['onValueUpdate']
	ariaLabel: string
}) {
	return (
		<Listbox<string>
			aria-label={ariaLabel}
			className="w-full"
			value={value || undefined}
			onValueChange={(next) => onValueUpdate(next ?? '')}
			displayValue={(v) => options.find((option) => option.value === v)?.label ?? v}
		>
			{options.map((option) => (
				<ListboxOption key={option.value} value={option.value}>
					<ListboxLabel>{option.label}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}

function isoToDate(iso: string): Date | undefined {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)

	return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined
}

function dateToIso(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0')

	const day = String(date.getDate()).padStart(2, '0')

	return `${date.getFullYear()}-${month}-${day}`
}

/** A date slot: a typed `DatePicker` in input mode, staging an ISO string. */
function CellDate({ value, onValueUpdate, ariaLabel }: GridEditCellContext<unknown>) {
	return (
		<DatePicker
			input
			format="YYYY-MM-DD"
			aria-label={ariaLabel}
			className="w-full"
			value={typeof value === 'string' ? isoToDate(value) : undefined}
			onValueChange={(date) => onValueUpdate(date ? dateToIso(date) : '')}
		/>
	)
}

/** A currency slot: a `CurrencyInput`, staging a number. */
function CellCurrency({ value, onValueUpdate, ariaLabel }: GridEditCellContext<unknown>) {
	return (
		<CurrencyInput
			aria-label={ariaLabel}
			className="w-full"
			value={typeof value === 'number' ? value : null}
			onValueChange={(next) => onValueUpdate(next ?? undefined)}
		/>
	)
}

type Person = { id: number; name: string; email: string; role: string; active: boolean }

const initialPeople: Person[] = [
	{ id: 1, name: 'Wade Cooper', email: 'wade@example.com', role: 'Developer', active: true },
	{ id: 2, name: 'Arlene McCoy', email: 'arlene@example.com', role: 'Designer', active: true },
	{ id: 3, name: 'Devon Webb', email: 'devon@example.com', role: 'Manager', active: false },
	{ id: 4, name: 'Tom Cook', email: 'tom@example.com', role: 'Developer', active: true },
]

const roleOptions = ['Developer', 'Designer', 'Manager', 'Analyst'].map((role) => ({
	label: role,
	value: role,
}))

function EditableExample() {
	const [people, setPeople] = useState<Person[]>(initialPeople)

	const [editing, setEditing] = useState<Set<string | number>>(new Set())

	const setRowEditing = (id: number, on: boolean) =>
		setEditing((prev) => {
			const next = new Set(prev)

			on ? next.add(id) : next.delete(id)

			return next
		})

	// `name`/`email` infer a text editor and `active` a yes/no listbox from their
	// value type; `role` overrides with a listbox slot. The pencil swaps the whole
	// row into edit mode (every cell becomes an editor); the check saves the row's
	// edits together. `trigger: 'doubleClick'` adds the grid-owned session over
	// the same binding: double-click a cell (or press Enter on the cursor's active
	// cell) to start editing its row, Enter in an editor to save, Escape to
	// discard.
	const columns: GridColumn<Person>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'email', title: 'Email', field: 'email', cell: (row) => row.email },
		{
			id: 'role',
			title: 'Role',
			field: 'role',
			cell: (row) => row.role,
			editCell: (ctx) => (
				<CellListbox
					value={String(ctx.value ?? '')}
					options={roleOptions}
					onValueUpdate={ctx.onValueUpdate}
					ariaLabel={ctx.ariaLabel}
				/>
			),
		},
		{
			id: 'active',
			title: 'Active',
			field: 'active',
			cell: (row) => (
				<Badge color={row.active ? 'green' : 'zinc'}>{row.active ? 'Active' : 'Inactive'}</Badge>
			),
		},
		{
			id: 'actions',
			actions: (row) =>
				editing.has(row.id) ? (
					<Button
						variant="bare"
						color="green"
						aria-label="Save row"
						onClick={() => setRowEditing(row.id, false)}
					>
						<Icon icon={<Check />} />
					</Button>
				) : (
					<Flex gap="sm">
						<Button
							variant="bare"
							color="blue"
							aria-label="Edit row"
							onClick={() => setRowEditing(row.id, true)}
						>
							<Icon icon={<Pencil />} />
						</Button>
						<Button
							variant="bare"
							color="red"
							aria-label="Delete row"
							onClick={() => setPeople((prev) => prev.filter((p) => p.id !== row.id))}
						>
							<Icon icon={<Trash2 />} />
						</Button>
					</Flex>
				),
		},
	]

	return (
		<>
			<EditHelp label="Editing help">
				Double-click a cell (or click the pencil) to edit its row: every cell becomes an editor at
				once. Enter saves the row's changes together — as does the check — and Escape discards them.
			</EditHelp>
			<Grid
				columns={columns}
				rows={people}
				getKey={(row) => row.id}
				editable={{
					rows: editing,
					onRowsChange: setEditing,
					trigger: 'doubleClick',
					onValueChange: (changes) => setPeople((prev) => applyChanges(prev, changes)),
				}}
			/>
		</>
	)
}

type Task = {
	id: number
	title: string
	status: string
	due: string
	done: boolean
	budget: number
}

const initialTasks: Task[] = [
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

function EditorTypesExample() {
	const money = useFormat({ type: 'currency' })

	// Every row stays editable so each editor type shows at once: `title` infers a
	// text editor and `done` a yes/no listbox, while `status`, `due`, and `budget`
	// override with listbox, date, and currency slots. Because no row ever leaves
	// the editable set, nothing commits — this example showcases the editors
	// themselves; see EditableExample for the save/commit cycle.
	const editing = useMemo(() => new Set<string | number>(initialTasks.map((task) => task.id)), [])

	const columns: GridColumn<Task>[] = [
		{ id: 'title', title: 'Title', field: 'title', cell: (row) => row.title, width: '200px' },
		{
			id: 'status',
			title: 'Status',
			field: 'status',
			cell: (row) =>
				statusOptions.find((option) => option.value === row.status)?.label ?? row.status,
			editCell: (ctx) => (
				<CellListbox
					value={String(ctx.value ?? '')}
					options={statusOptions}
					onValueUpdate={ctx.onValueUpdate}
					ariaLabel={ctx.ariaLabel}
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
	]

	return (
		<>
			<EditHelp label="Editor types help">
				Title is a text cell and Done a yes/no listbox, inferred from the value type; Status, Due,
				and Budget edit through listbox, date-picker, and currency slots.
			</EditHelp>
			<Grid
				columns={columns}
				rows={initialTasks}
				getKey={(row) => row.id}
				editable={{
					rows: editing,
					// Required sink; inert here because no row leaves the editable set.
					onValueChange: () => {},
				}}
			/>
		</>
	)
}

type LaneRate = { id: number; state: string; perMile: number; minCharge: number; fuelPct: number }

const initialRates: LaneRate[] = [
	{ id: 1, state: 'CA', perMile: 2.35, minCharge: 250, fuelPct: 28 },
	{ id: 2, state: 'NV', perMile: 2.2, minCharge: 225, fuelPct: 26 },
	{ id: 3, state: 'AZ', perMile: 2.1, minCharge: 210, fuelPct: 25 },
	{ id: 4, state: 'OR', perMile: 2.3, minCharge: 240, fuelPct: 27 },
	{ id: 5, state: 'WA', perMile: 2.4, minCharge: 255, fuelPct: 28 },
	{ id: 6, state: 'TX', perMile: 2.15, minCharge: 215, fuelPct: 26 },
]

// CurrencyInput doesn't bind to Form via `name` like NumberInput does; this
// wrapper bridges it for the bulk-edit dialog.
function FormCurrencyInput({ name, placeholder }: { name: string; placeholder?: string }) {
	const field = useFormField(name)

	return (
		<CurrencyInput
			placeholder={placeholder}
			value={(field?.value as number | undefined) ?? null}
			onValueChange={(v) => field?.setValue(v)}
		/>
	)
}

function BulkEditExample() {
	const money = useFormat({ type: 'currency' })

	const [rates, setRates] = useState<LaneRate[]>(initialRates)

	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	const [editOpen, setEditOpen] = useState(false)

	const applyBulkEdit = (patch: Partial<Pick<LaneRate, 'perMile' | 'minCharge' | 'fuelPct'>>) => {
		if (Object.keys(patch).length) {
			setRates((prev) => prev.map((row) => (selection.has(row.id) ? { ...row, ...patch } : row)))
		}

		setEditOpen(false)
	}

	const editDefaults = useMemo(() => {
		const empty = {
			perMile: undefined as number | undefined,
			minCharge: undefined as number | undefined,
			fuelPct: undefined as number | undefined,
		}

		if (selection.size !== 1) return empty

		const [onlyId] = selection

		const row = rates.find((r) => r.id === onlyId)

		return row ? { perMile: row.perMile, minCharge: row.minCharge, fuelPct: row.fuelPct } : empty
	}, [rates, selection])

	const bulkColumns: GridColumn<LaneRate>[] = [
		{ id: 'select', selectable: true },
		{ id: 'state', title: 'State', cell: (row) => row.state, width: '80px' },
		{ id: 'perMile', title: 'Per-mile', cell: (row) => money(row.perMile) },
		{ id: 'minCharge', title: 'Min charge', cell: (row) => money(row.minCharge) },
		{ id: 'fuelPct', title: 'Fuel %', cell: (row) => `${row.fuelPct}%` },
	]

	return (
		<>
			<EditHelp label="Bulk edit help">
				Select rows with the checkboxes, then choose Edit selected to apply one change across every
				selected row at once through a dialog.
			</EditHelp>
			<Grid
				columns={bulkColumns}
				rows={rates}
				getKey={(row) => row.id}
				selection={{
					value: selection,
					onValueChange: (s) => setSelection(s ?? new Set()),
					batchActions: ({ setSelection: setSelected }) => (
						<Flex gap="sm">
							<Button variant="soft" onClick={() => setSelected(new Set())}>
								Deselect all
							</Button>
							<Button variant="soft" color="blue" onClick={() => setEditOpen(true)}>
								Edit selected ({selection.size})
							</Button>
						</Flex>
					),
				}}
			/>
			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogHeader>
					<DialogTitle>Edit selected ({selection.size})</DialogTitle>
				</DialogHeader>

				{selection.size > 1 && (
					<Alert severity="info" closable>
						<Flex gap="md" align="center">
							Enter a value to apply it across all selected rows; leave blank to keep current
							values.
						</Flex>
					</Alert>
				)}

				<Form
					defaultValues={editDefaults}
					onSubmit={(values) => {
						const patch: Partial<Pick<LaneRate, 'perMile' | 'minCharge' | 'fuelPct'>> = {}

						if (typeof values.perMile === 'number') patch.perMile = values.perMile
						if (typeof values.minCharge === 'number') patch.minCharge = values.minCharge
						if (typeof values.fuelPct === 'number') patch.fuelPct = values.fuelPct

						applyBulkEdit(patch)
					}}
				>
					<DialogContent>
						<DialogBody>
							<Stack gap="lg">
								<Field>
									<Label>Per-mile</Label>
									<FormCurrencyInput name="perMile" placeholder="No change" />
								</Field>
								<Field>
									<Label>Min charge</Label>
									<FormCurrencyInput name="minCharge" placeholder="No change" />
								</Field>
								<Field>
									<Label>Fuel %</Label>
									<NumberInput name="fuelPct" step={1} min={0} max={100} placeholder="No change" />
								</Field>
							</Stack>
						</DialogBody>
						<DialogFooter>
							<Button variant="plain" onClick={() => setEditOpen(false)}>
								Cancel
							</Button>
							<SubmitButton color="blue">Apply</SubmitButton>
						</DialogFooter>
					</DialogContent>
				</Form>
			</Dialog>
		</>
	)
}

export function Demo() {
	return (
		<Stack gap="xl">
			<Example
				title="Editable"
				code={code`<Grid editable={{ rows, onRowsChange, onValueChange }} />`}
			>
				<EditableExample />
			</Example>

			<Example
				title="Editor types"
				code={code`<Grid columns={[{ ...col, field, editCell }]} editable={{ rows, onValueChange }} />`}
			>
				<EditorTypesExample />
			</Example>

			<Example title="Bulk edit">
				<BulkEditExample />
			</Example>
		</Stack>
	)
}
