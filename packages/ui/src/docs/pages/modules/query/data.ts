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

export type Member = {
	name: string
	age: number
	status: 'active' | 'pending' | 'archived'
	joined: string
	verified: boolean
}

// The rows that a query filters, with a value for each field.
export const members: Member[] = [
	{ name: 'Wade Cooper', age: 34, status: 'active', joined: '2021-03-14', verified: true },
	{ name: 'Arlene McCoy', age: 27, status: 'pending', joined: '2024-06-02', verified: false },
	{ name: 'Devon Webb', age: 45, status: 'active', joined: '2019-11-20', verified: true },
	{ name: 'Tom Cook', age: 17, status: 'active', joined: '2025-01-08', verified: false },
	{ name: 'Tanya Fox', age: 52, status: 'archived', joined: '2018-04-30', verified: true },
	{ name: 'Hellen Schmidt', age: 31, status: 'active', joined: '2023-09-12', verified: false },
]
