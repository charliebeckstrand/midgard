'use client'

import { Info } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/button'
import { CurrencyInput } from '../../components/currency-input'
import {
	Dialog,
	DialogActions,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '../../components/dialog'
import {
	type CellChange,
	EditableGrid,
	type EditableGridColumn,
	EditableGridCurrencyEditor,
	EditableGridNumberEditor,
} from '../../components/editable-grid'
import { Field, Label } from '../../components/fieldset'
import { Flex } from '../../components/flex'
import { Form, useFormField } from '../../components/form'
import { HoldButton } from '../../components/hold-button'
import { Icon } from '../../components/icon'
import { NumberInput } from '../../components/number-input'
import { Stack } from '../../components/stack'
import { SubmitButton } from '../../components/submit-button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

type LaneRate = {
	id: number
	state: string
	perMile: number
	minCharge: number
	fuelPct: number
}

const initialRates: LaneRate[] = [
	{ id: 1, state: 'CA', perMile: 2.35, minCharge: 250, fuelPct: 28 },
	{ id: 2, state: 'NV', perMile: 2.2, minCharge: 225, fuelPct: 26 },
	{ id: 3, state: 'AZ', perMile: 2.1, minCharge: 210, fuelPct: 25 },
	{ id: 4, state: 'OR', perMile: 2.3, minCharge: 240, fuelPct: 27 },
	{ id: 5, state: 'WA', perMile: 2.4, minCharge: 255, fuelPct: 28 },
	{ id: 6, state: 'TX', perMile: 2.15, minCharge: 215, fuelPct: 26 },
]

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// CurrencyInput doesn't bind to Form via `name` the way NumberInput does, so
// bridge it manually for the bulk-edit dialog.
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

const numericColumn = (
	col: Partial<EditableGridColumn<LaneRate>>,
): EditableGridColumn<LaneRate> => ({
	id: col.id as string,
	title: col.title,
	parse: (raw) => {
		const n = Number(raw)

		return Number.isFinite(n) ? n : undefined
	},
	...col,
})

function applyChanges<T extends { id: number }>(rows: T[], changes: CellChange[]): T[] {
	if (!changes.length) return rows

	const byKey = new Map<string | number, Record<string, unknown>>()

	for (const c of changes) {
		const entry = byKey.get(c.rowKey) ?? {}

		entry[c.columnId as string] = c.value

		byKey.set(c.rowKey, entry)
	}

	return rows.map((row) => {
		const patch = byKey.get(row.id)

		return patch ? ({ ...row, ...patch } as T) : row
	})
}

export function Demo() {
	const columns = useMemo<EditableGridColumn<LaneRate>[]>(
		() => [
			{ id: 'state', title: 'State', field: 'state', readOnly: true, width: '80px' },
			numericColumn({
				id: 'perMile',
				title: 'Per-mile',
				field: 'perMile',
				format: (r) => currency.format(r.perMile),
				editor: EditableGridCurrencyEditor,
			}),
			numericColumn({
				id: 'minCharge',
				title: 'Min charge',
				field: 'minCharge',
				format: (r) => currency.format(r.minCharge),
				editor: EditableGridCurrencyEditor,
			}),
			numericColumn({
				id: 'fuelPct',
				title: 'Fuel %',
				field: 'fuelPct',
				format: (r) => `${r.fuelPct}%`,
				editor: (props) => <EditableGridNumberEditor {...props} min={0} max={100} step={1} />,
			}),
		],
		[],
	)

	const bulkColumns = useMemo<EditableGridColumn<LaneRate>[]>(
		() => [{ id: 'select', selectable: true, width: '48px' }, ...columns],
		[columns],
	)

	const DefaultExample = () => {
		const [rates, setRates] = useState<LaneRate[]>(initialRates)

		return (
			<EditableGrid
				grid
				columns={columns}
				rows={rates}
				getKey={(row) => row.id}
				onValueChange={(changes) => setRates((prev) => applyChanges(prev, changes))}
			/>
		)
	}

	const BulkUpdateExample = () => {
		const [bulkRates, setBulkRates] = useState<LaneRate[]>(initialRates)

		const [selection, setSelection] = useState<Set<string | number>>(new Set())

		const [editOpen, setEditOpen] = useState(false)

		const hasChanges = useMemo(() => {
			if (!selection.size) return false

			for (const row of bulkRates) {
				if (selection.has(row.id)) {
					const original = initialRates.find((r) => r.id === row.id)

					if (
						original &&
						(row.perMile !== original.perMile ||
							row.minCharge !== original.minCharge ||
							row.fuelPct !== original.fuelPct)
					) {
						return true
					}
				}
			}

			return false
		}, [bulkRates, selection])

		const applyBulkEdit = (patch: Partial<Pick<LaneRate, 'perMile' | 'minCharge' | 'fuelPct'>>) => {
			if (!Object.keys(patch).length) {
				setEditOpen(false)

				return
			}

			setBulkRates((prev) =>
				prev.map((row) => (selection.has(row.id) ? { ...row, ...patch } : row)),
			)

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

			const row = bulkRates.find((r) => r.id === onlyId)

			return row ? { perMile: row.perMile, minCharge: row.minCharge, fuelPct: row.fuelPct } : empty
		}, [bulkRates, selection])

		return (
			<>
				<EditableGrid
					grid
					columns={bulkColumns}
					rows={bulkRates}
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
									Edit selected
								</Button>
								{hasChanges && (
									<HoldButton
										color="red"
										variant="soft"
										onComplete={() => {
											setBulkRates((prev) =>
												prev.map((row) => {
													if (!selection.has(row.id)) return row

													const original = initialRates.find((r) => r.id === row.id)

													return original ?? row
												}),
											)
										}}
									>
										Reset selected
									</HoldButton>
								)}
							</Flex>
						),
					}}
					onValueChange={(changes) => setBulkRates((prev) => applyChanges(prev, changes))}
				/>
				<Dialog open={editOpen} onOpenChange={setEditOpen}>
					<DialogTitle>Edit {selection.size} selected</DialogTitle>
					{selection.size > 1 && (
						<DialogDescription>
							<Flex gap="md">
								<Icon icon={<Info />} />
								<span>
									Leave a field blank to keep the current value, or enter a new value to apply it to
									all selected rows.
								</span>
							</Flex>
						</DialogDescription>
					)}
					<DialogContent>
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
										<NumberInput
											name="fuelPct"
											step={1}
											min={0}
											max={100}
											placeholder="No change"
										/>
									</Field>
								</Stack>
							</DialogBody>
							<DialogActions>
								<Button variant="plain" onClick={() => setEditOpen(false)}>
									Cancel
								</Button>
								<SubmitButton color="blue">Apply</SubmitButton>
							</DialogActions>
						</Form>
					</DialogContent>
				</Dialog>
			</>
		)
	}

	return (
		<>
			<Example title="Default">
				<Flex justify="end">
					<Tooltip placement="left">
						<TooltipTrigger>
							<Icon icon={<Info />} />
						</TooltipTrigger>
						<TooltipContent>
							Double click a cell to or press Enter to edit. Press Enter or blur to save, Escape to
							cancel.
						</TooltipContent>
					</Tooltip>
				</Flex>
				<DefaultExample />
			</Example>
			<Example title="Bulk update">
				<Flex justify="end">
					<Tooltip placement="left">
						<TooltipTrigger>
							<Icon icon={<Info />} />
						</TooltipTrigger>
						<TooltipContent>
							Check the boxes to select multiple rows, then edit a cell to apply the change to all
							selected rows.
						</TooltipContent>
					</Tooltip>
				</Flex>
				<BulkUpdateExample />
			</Example>
		</>
	)
}
