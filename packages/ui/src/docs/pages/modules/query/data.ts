import type { QueryField, QueryGroup } from 'ui/query'

export const fields: QueryField[] = [
	{ name: 'name', label: 'Name', type: 'text' },
	// The span that a grid column filter gets from its data. The bounds of a
	// `between` rule clamp to it and show it as their placeholders.
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

export const seed: QueryGroup = {
	id: 'root',
	type: 'group',
	combinator: 'and',
	children: [{ id: 'r1', type: 'rule', field: 'status', operator: 'equals', value: 'active' }],
}

// Three active rules, two of them in a nested group joined by OR, so the chips
// show each separator.
export const filters: QueryGroup = {
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
				{ id: 'r2', type: 'rule', field: 'age', operator: 'gte', value: 18 },
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
