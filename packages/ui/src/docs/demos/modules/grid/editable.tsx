import { Check, Info, Pencil, Trash2 } from 'lucide-react'
import { type KeyboardEvent, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Alert } from '../../../../components/alert'
import { Badge } from '../../../../components/badge'
import { Button } from '../../../../components/button'
import { CurrencyInput } from '../../../../components/currency-input'
import { DateInput } from '../../../../components/date-input'
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
import { NumberInput } from '../../../../components/number-input'
import { Select, SelectLabel, SelectOption } from '../../../../components/select'
import { Stack } from '../../../../components/stack'
import { SubmitButton } from '../../../../components/submit-button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/tooltip'
import {
	type CellChange,
	Grid,
	type GridColumn,
	type GridEditCellContext,
} from '../../../../modules/grid'

// Applies committed cell changes onto the row state: each change patches one
// field on the row it keys. The grid emits these through `editable.onValueChange`.
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
// editor components. Each receives the cell value plus commit/cancel, mirroring
// the inferred text/number/checkbox editors the grid mounts for primitive cells.

/** A select slot: opens on mount, commits the picked option, cancels on dismiss. */
function CellSelect({
	value,
	options,
	commit,
	cancel,
	ariaLabel,
}: {
	value: string
	options: { label: string; value: string }[]
	commit: GridEditCellContext<unknown>['commit']
	cancel: () => void
	ariaLabel: string
}) {
	const [open, setOpen] = useState(true)

	const picked = useRef(false)

	return (
		<Select<string>
			open={open}
			onOpenChange={(next) => {
				setOpen(next)

				if (!next && !picked.current) cancel()
			}}
			value={value || undefined}
			onValueChange={(next) => {
				if (next == null) return

				picked.current = true

				commit(next)
			}}
			displayValue={(v) => options.find((option) => option.value === v)?.label ?? v}
			aria-label={ariaLabel}
		>
			{options.map((option) => (
				<SelectOption key={option.value} value={option.value}>
					<SelectLabel>{option.label}</SelectLabel>
				</SelectOption>
			))}
		</Select>
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

function editKeyDown(commit: () => void, cancel: () => void) {
	return (event: KeyboardEvent<HTMLElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault()

			commit()
		} else if (event.key === 'Escape') {
			event.preventDefault()

			cancel()
		}
	}
}

/** A date slot: masked ISO entry, commits on Enter/blur, cancels on Escape. */
function CellDate({
	value,
	onValueUpdate,
	commit,
	cancel,
	ariaLabel,
}: GridEditCellContext<unknown>) {
	const ref = useRef<HTMLInputElement>(null)

	useLayoutEffect(() => {
		ref.current?.focus()

		ref.current?.select()
	}, [])

	return (
		<DateInput
			ref={ref}
			className="w-full"
			format="YYYY-MM-DD"
			aria-label={ariaLabel}
			defaultValue={typeof value === 'string' ? isoToDate(value) : undefined}
			onValueChange={(date) => onValueUpdate(date ? dateToIso(date) : '')}
			onBlur={() => commit()}
			onKeyDown={editKeyDown(() => commit(), cancel)}
		/>
	)
}

/** A currency slot: numeric entry, commits on Enter/blur, cancels on Escape. */
function CellCurrency({
	value,
	onValueUpdate,
	commit,
	cancel,
	ariaLabel,
}: GridEditCellContext<unknown>) {
	const ref = useRef<HTMLInputElement>(null)

	useLayoutEffect(() => {
		ref.current?.focus()

		ref.current?.select()
	}, [])

	return (
		<CurrencyInput
			ref={ref}
			aria-label={ariaLabel}
			value={typeof value === 'number' ? value : null}
			onValueChange={(next) => onValueUpdate(next ?? undefined)}
			onBlur={() => commit()}
			onKeyDown={editKeyDown(() => commit(), cancel)}
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

export function EditableExample() {
	const [people, setPeople] = useState<Person[]>(initialPeople)

	const [editing, setEditing] = useState<Set<string | number>>(new Set())

	const toggleEditing = (id: number) =>
		setEditing((prev) => {
			const next = new Set(prev)

			next.has(id) ? next.delete(id) : next.add(id)

			return next
		})

	// `name`/`email` infer a text editor and `active` a checkbox from their value
	// type; `role` overrides with a select slot. The pencil flips a row editable;
	// while editable, click a cell to focus it and double-click or press Enter to
	// edit it.
	const columns: GridColumn<Person>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'email', title: 'Email', field: 'email', cell: (row) => row.email },
		{
			id: 'role',
			title: 'Role',
			field: 'role',
			cell: (row) => row.role,
			editCell: (ctx) => (
				<CellSelect
					value={String(ctx.value ?? '')}
					options={roleOptions}
					commit={ctx.commit}
					cancel={ctx.cancel}
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
						aria-label="Done editing"
						onClick={() => toggleEditing(row.id)}
					>
						<Icon icon={<Check />} />
					</Button>
				) : (
					<Flex gap="sm">
						<Button
							variant="bare"
							color="blue"
							aria-label="Edit row"
							onClick={() => toggleEditing(row.id)}
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
				Click the pencil to make a row editable, then click a cell to focus it and double-click or
				press Enter to edit. Enter saves, Escape cancels. Click the check to finish.
			</EditHelp>
			<Grid
				columns={columns}
				rows={people}
				getKey={(row) => row.id}
				editable={{
					rows: editing,
					onRowsChange: setEditing,
					onValueChange: (changes) => setPeople((prev) => applyChanges(prev, changes)),
				}}
			/>
		</>
	)
}

type Task = { id: number; title: string; status: string; due: string; done: boolean }

const initialTasks: Task[] = [
	{ id: 1, title: 'Fix login redirect', status: 'in-progress', due: '2026-01-15', done: false },
	{ id: 2, title: 'Add dark mode', status: 'todo', due: '2026-03-01', done: false },
	{ id: 3, title: 'Write API docs', status: 'done', due: '2026-02-10', done: true },
]

const statusOptions = [
	{ label: 'Todo', value: 'todo' },
	{ label: 'In progress', value: 'in-progress' },
	{ label: 'Done', value: 'done' },
]

export function EditorTypesExample() {
	const [tasks, setTasks] = useState<Task[]>(initialTasks)

	// Every row is editable here so any cell can be edited. `title` infers a text
	// editor and `done` a checkbox; `status` and `due` override with select and
	// date slots.
	const editing = useMemo(() => new Set<string | number>(tasks.map((task) => task.id)), [tasks])

	const columns: GridColumn<Task>[] = [
		{ id: 'title', title: 'Title', field: 'title', cell: (row) => row.title, width: '220px' },
		{
			id: 'status',
			title: 'Status',
			field: 'status',
			cell: (row) =>
				statusOptions.find((option) => option.value === row.status)?.label ?? row.status,
			editCell: (ctx) => (
				<CellSelect
					value={String(ctx.value ?? '')}
					options={statusOptions}
					commit={ctx.commit}
					cancel={ctx.cancel}
					ariaLabel={ctx.ariaLabel}
				/>
			),
		},
		{ id: 'due', title: 'Due', field: 'due', cell: (row) => row.due, editCell: CellDate },
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
				Title is a text cell and Done a checkbox, inferred from the value type; Status edits with a
				dropdown and Due with a date picker through the column's editCell slot.
			</EditHelp>
			<Grid
				columns={columns}
				rows={tasks}
				getKey={(row) => row.id}
				editable={{
					rows: editing,
					onValueChange: (changes) => setTasks((prev) => applyChanges(prev, changes)),
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

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

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

export function BulkEditExample() {
	const [rates, setRates] = useState<LaneRate[]>(initialRates)

	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	const [editOpen, setEditOpen] = useState(false)

	// Every row is inline-editable; selection drives the dialog-based bulk edit.
	const editing = useMemo(() => new Set<string | number>(rates.map((rate) => rate.id)), [rates])

	// `perMile`/`minCharge` edit through a currency slot; `fuelPct` infers a number
	// editor from its value type.
	const columns: GridColumn<LaneRate>[] = [
		{
			id: 'state',
			title: 'State',
			field: 'state',
			cell: (row) => row.state,
			readOnly: true,
			width: '80px',
		},
		{
			id: 'perMile',
			title: 'Per-mile',
			field: 'perMile',
			cell: (row) => currency.format(row.perMile),
			editCell: CellCurrency,
			validate: (value) =>
				typeof value === 'number' && value > 0 ? null : 'Enter a rate above $0',
		},
		{
			id: 'minCharge',
			title: 'Min charge',
			field: 'minCharge',
			cell: (row) => currency.format(row.minCharge),
			editCell: CellCurrency,
		},
		{
			id: 'fuelPct',
			title: 'Fuel %',
			field: 'fuelPct',
			cell: (row) => `${row.fuelPct}%`,
		},
	]

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

	return (
		<>
			<EditHelp label="Bulk edit help">
				Edit a cell inline, or select rows with the checkboxes and choose Edit selected to apply one
				change across every selected row at once.
			</EditHelp>
			<Grid
				columns={[{ id: 'select', selectable: true }, ...columns]}
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
				editable={{
					rows: editing,
					onValueChange: (changes) => setRates((prev) => applyChanges(prev, changes)),
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
