import { useState } from 'react'
import { JsonTree, type JsonValue } from '../../components/json-tree'
import { QueryBuilder, type QueryField, type QueryGroupNode } from '../../components/query-builder'
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

function ControlledExample() {
	const [query, setQuery] = useState<QueryGroupNode>(seed)

	return (
		<Example title="Controlled">
			<Stack gap="md">
				<QueryBuilder fields={fields} value={query} onValueChange={setQuery} />
				{/* QueryGroupNode declares `value: unknown` and an optional combinator; this demo
				    only feeds string values with a combinator on every node, so the tree is
				    JSON-shaped in practice. */}
				<JsonTree data={query as unknown as JsonValue} defaultExpandDepth={Infinity} />
			</Stack>
		</Example>
	)
}

function DisabledExample() {
	return (
		<Example title="Disabled">
			<QueryBuilder fields={fields} defaultValue={seed} disabled />
		</Example>
	)
}

export function Demo() {
	return (
		<>
			<ControlledExample />
			<DisabledExample />
		</>
	)
}
