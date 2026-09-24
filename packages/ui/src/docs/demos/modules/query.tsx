import { useState } from 'react'
import { JsonTree, type JsonValue } from '../../../components/json-tree'
import { Stack } from '../../../components/stack'
import {
	QueryBuilder,
	QueryChips,
	type QueryField,
	type QueryGroup,
	QuerySummary,
} from '../../../modules/query'
import { Example } from '../../engine'

const fields: QueryField[] = [
	{ name: 'name', label: 'Name', type: 'text' },
	// The span a grid column filter fills from its data: a `between` rule's bounds
	// clamp to it and show it as their placeholders.
	{ name: 'age', label: 'Age', type: 'number', span: [18, 90] },
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

const seed: QueryGroup = {
	id: 'root',
	type: 'group',
	combinator: 'and',
	children: [{ id: 'r1', type: 'rule', field: 'status', operator: 'equals', value: 'active' }],
}

function BuilderExample() {
	const [query, setQuery] = useState<QueryGroup>(seed)

	return (
		<Example title="Builder">
			<Stack gap="md">
				<QueryBuilder fields={fields} value={query} onValueChange={setQuery} />
				{/* The read view over the same tree: a human-readable line that updates as
				    the builder edits and disappears when no rule constrains. */}
				<QuerySummary value={query} fields={fields} />
				{/* QueryGroup declares `value: unknown` and an optional combinator; this demo
				    feeds string values with a combinator on every node, leaving the tree
				    JSON-shaped. */}
				<JsonTree data={query as unknown as JsonValue} defaultExpandDepth={0} />
			</Stack>
		</Example>
	)
}

// Two active rules and a nested OR group, so the chips show each separator.
const filters: QueryGroup = {
	id: 'root',
	type: 'group',
	combinator: 'and',
	children: [
		{ id: 'r1', type: 'rule', field: 'status', operator: 'equals', value: 'active' },
		{
			id: 'g1',
			type: 'group',
			combinator: 'and',
			children: [
				{ id: 'r2', type: 'rule', field: 'age', operator: 'gte', value: '18' },
				{
					id: 'r3',
					type: 'rule',
					combinator: 'or',
					field: 'verified',
					operator: 'isTrue',
					value: null,
				},
			],
		},
	],
}

function ChipsExample() {
	const [query, setQuery] = useState<QueryGroup>(filters)

	return (
		<Example title="Chips">
			<Stack gap="md">
				{/* A filter bar over the same tree: remove a chip to drop its rule, or
				    click AND/OR to switch it. The builder follows each edit. */}
				<QueryChips value={query} fields={fields} onValueChange={setQuery} />
				<QueryBuilder fields={fields} value={query} onValueChange={setQuery} />
			</Stack>
		</Example>
	)
}

function ReorderExample() {
	const [query, setQuery] = useState<QueryGroup>(filters)

	return (
		<Example title="Reorder">
			<Stack gap="md">
				{/* Drag a grip, or press Space on it and use the arrow keys. A node moves
				    among its siblings, and each AND/OR stays in its position. */}
				<QueryBuilder fields={fields} value={query} onValueChange={setQuery} reorder />
				<QuerySummary value={query} fields={fields} />
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
			<BuilderExample />
			<ChipsExample />
			<ReorderExample />
			<DisabledExample />
		</>
	)
}
