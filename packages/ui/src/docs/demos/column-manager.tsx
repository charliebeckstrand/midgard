'use client'

import { useState } from 'react'
import {
	ColumnManager,
	type ColumnManagerItem,
	type ColumnManagerPreset,
} from '../../components/column-manager'
import { DataTable, type DataTableColumn } from '../../components/data-table'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

// ── Sample data ────────────────────────────────────────

type Person = {
	id: number
	name: string
	email: string
	role: string
	team: string
	location: string
}

const people: Person[] = [
	{
		id: 1,
		name: 'Wade Cooper',
		email: 'wade@example.com',
		role: 'Developer',
		team: 'Platform',
		location: 'NYC',
	},
	{
		id: 2,
		name: 'Arlene McCoy',
		email: 'arlene@example.com',
		role: 'Designer',
		team: 'Product',
		location: 'LA',
	},
	{
		id: 3,
		name: 'Devon Webb',
		email: 'devon@example.com',
		role: 'Manager',
		team: 'Product',
		location: 'SF',
	},
]

const tableColumns: DataTableColumn<Person>[] = [
	{ id: 'name', title: 'Name', pinned: true, cell: (row) => row.name },
	{ id: 'email', title: 'Email', cell: (row) => row.email },
	{ id: 'role', title: 'Role', cell: (row) => row.role },
	{ id: 'team', title: 'Team', cell: (row) => row.team },
	{ id: 'location', title: 'Location', cell: (row) => row.location },
]

// ── Standalone ─────────────────────────────────────────

const standaloneColumns: ColumnManagerItem[] = [
	{ id: 'name', title: 'Name', pinned: true },
	{ id: 'email', title: 'Email' },
	{ id: 'role', title: 'Role' },
	{ id: 'team', title: 'Team' },
	{ id: 'location', title: 'Location' },
]

function StandaloneExample() {
	const [order, setOrder] = useState<(string | number)[]>([
		'name',
		'email',
		'role',
		'team',
		'location',
	])
	const [hidden, setHidden] = useState<Set<string | number>>(new Set(['location']))

	return (
		<ColumnManager
			columns={standaloneColumns}
			order={order}
			onOrderChange={setOrder}
			hidden={hidden}
			onHiddenChange={setHidden}
		/>
	)
}

// ── Integrated ─────────────────────────────────────────

function IntegratedExample() {
	return (
		<DataTable
			manageColumns
			columns={tableColumns}
			rows={people}
			getRowKey={(row) => row.id}
			defaultHiddenColumns={new Set(['location'])}
		/>
	)
}

function PresetExample() {
	const [preset, setPreset] = useState<ColumnManagerPreset | null>(null)

	return (
		<Stack gap={3}>
			<DataTable
				manageColumns
				columns={tableColumns}
				rows={people}
				getRowKey={(row) => row.id}
				onSavePreset={setPreset}
			/>
			{preset && (
				<Text>
					<strong>Saved preset:</strong> order = {preset.order.join(', ')} · hidden ={' '}
					{preset.hidden.length > 0 ? preset.hidden.join(', ') : '(none)'}
				</Text>
			)}
		</Stack>
	)
}

export default function ColumnManagerDemo() {
	return (
		<Stack gap={6}>
			<Example
				title="Built into DataTable"
				code={code`
					import { DataTable } from 'ui/data-table'

					<DataTable
						manageColumns
						columns={columns}
						rows={rows}
						getRowKey={(row) => row.id}
						defaultHiddenColumns={new Set(['location'])}
					/>
				`}
			>
				<IntegratedExample />
			</Example>

			<Example
				title="Standalone"
				code={code`
					import { ColumnManager } from 'ui/column-manager'

					<ColumnManager
						columns={columns}
						order={order}
						onOrderChange={setOrder}
						hidden={hidden}
						onHiddenChange={setHidden}
					/>
				`}
			>
				<StandaloneExample />
			</Example>

			<Example
				title="Save as preset"
				code={code`
					import { DataTable } from 'ui/data-table'

					<DataTable
						manageColumns
						onSavePreset={(preset) => saveView(preset)}
						columns={columns}
						rows={rows}
						getRowKey={(row) => row.id}
					/>
				`}
			>
				<PresetExample />
			</Example>
		</Stack>
	)
}
