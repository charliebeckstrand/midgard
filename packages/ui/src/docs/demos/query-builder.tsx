'use client'

import { useState } from 'react'
import { JsonTree, type JsonValue } from '../../components/json-tree'
import { QueryBuilder, type QueryField, type QueryGroupNode } from '../../components/query-builder'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

const fields: QueryField[] = [
	{ name: 'name', label: 'Name', type: 'text' },
	{ name: 'age', label: 'Age', type: 'number' },
	{
		name: 'status',
		label: 'Status',
		type: 'select',
		options: [
			{ value: 'active', label: 'Active' },
			{ value: 'pending', label: 'Pending' },
			{ value: 'archived', label: 'Archived' },
		],
	},
	{ name: 'joined', label: 'Joined date', type: 'date' },
	{ name: 'verified', label: 'Verified', type: 'boolean' },
]

const seed: QueryGroupNode = {
	id: 'root',
	type: 'group',
	combinator: 'and',
	children: [
		{ id: 'r1', type: 'rule', field: 'name', operator: 'contains', value: 'ada' },
		{ id: 'r2', type: 'rule', field: 'status', operator: 'equals', value: 'active' },
	],
}

function Controlled() {
	const [query, setQuery] = useState<QueryGroupNode>(seed)

	return (
		<Example title="Controlled">
			<Sizer size="lg">
				<Stack gap={3}>
					<QueryBuilder fields={fields} value={query} onChange={setQuery} />
					<JsonTree data={query as unknown as JsonValue} defaultExpandDepth={Infinity} />
				</Stack>
			</Sizer>
		</Example>
	)
}

function Disabled() {
	return (
		<Example title="Disabled">
			<Sizer size="lg">
				<QueryBuilder fields={fields} defaultValue={seed} disabled />
			</Sizer>
		</Example>
	)
}

export default function QueryBuilderDemo() {
	return (
		<Stack gap={6}>
			<Controlled />
			<Disabled />
		</Stack>
	)
}
