'use client'

import { useMemo, useState } from 'react'
import {
	type CellChange,
	EditableGrid,
	type EditableGridColumn,
} from '../../components/editable-grid'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

// ── Sample data ────────────────────────────────────────

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

const numericColumn = (
	col: Partial<EditableGridColumn<LaneRate>>,
): EditableGridColumn<LaneRate> => ({
	id: col.id as string,
	title: col.title,
	align: 'right',
	parse: (raw) => {
		const n = Number(raw)

		return Number.isFinite(n) ? n : undefined
	},
	...col,
})

// ── Apply a change batch to immutable rows ─────────────

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

// ── Demo ───────────────────────────────────────────────

export default function EditableGridDemo() {
	const [rates, setRates] = useState<LaneRate[]>(initialRates)
	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	const columns = useMemo<EditableGridColumn<LaneRate>[]>(
		() => [
			{ id: 'select', selectable: true, width: '48px' },
			{ id: 'state', title: 'State', field: 'state', readOnly: true, width: '80px' },
			numericColumn({
				id: 'perMile',
				title: 'Per-mile',
				field: 'perMile',
				format: (r) => currency.format(r.perMile),
			}),
			numericColumn({
				id: 'minCharge',
				title: 'Min charge',
				field: 'minCharge',
				format: (r) => currency.format(r.minCharge),
			}),
			numericColumn({
				id: 'fuelPct',
				title: 'Fuel %',
				field: 'fuelPct',
				format: (r) => `${r.fuelPct}%`,
			}),
		],
		[],
	)

	return (
		<Stack gap={6}>
			<Example
				title="Bulk update rates by state"
				prefix={
					<Text variant="muted" className="text-sm">
						Click a cell to activate it, double-click or Enter to edit. Select multiple rows with
						the checkboxes and commit an edit — the same value will be applied across every selected
						row.
					</Text>
				}
				code={code`
					import { EditableGrid, type EditableGridColumn } from 'ui/editable-grid'

					const columns: EditableGridColumn<LaneRate>[] = [
						{ id: 'select', selectable: true, width: '48px' },
						{ id: 'state', title: 'State', field: 'state', readOnly: true },
						{ id: 'perMile', title: 'Per-mile', field: 'perMile', align: 'right' },
						{ id: 'minCharge', title: 'Min charge', field: 'minCharge', align: 'right' },
						{ id: 'fuelPct', title: 'Fuel %', field: 'fuelPct', align: 'right' },
					]

					<EditableGrid
						columns={columns}
						rows={rates}
						getRowKey={(row) => row.id}
						selection={selection}
						onSelectionChange={setSelection}
						onChange={(changes) => setRates(applyChanges(rates, changes))}
					/>
				`}
			>
				<EditableGrid
					grid
					columns={columns}
					rows={rates}
					getRowKey={(row) => row.id}
					selection={selection}
					onSelectionChange={(s) => setSelection(s ?? new Set())}
					onChange={(changes) => setRates((prev) => applyChanges(prev, changes))}
				/>
			</Example>

			<Example
				title="Keyboard navigation"
				prefix={
					<Text variant="muted" className="text-sm">
						Arrow keys move the active cell. Enter or F2 begins editing the current value. Typing a
						printable character replaces the value. Tab and Shift+Tab commit and move horizontally.
						Delete clears a cell. Escape cancels an edit.
					</Text>
				}
			>
				<EditableGrid
					grid
					columns={columns.filter((c) => c.id !== 'select')}
					rows={rates}
					getRowKey={(row) => row.id}
					onChange={(changes) => setRates((prev) => applyChanges(prev, changes))}
				/>
			</Example>
		</Stack>
	)
}
