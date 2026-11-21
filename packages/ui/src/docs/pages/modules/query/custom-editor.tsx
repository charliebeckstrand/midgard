import { useEffect, useState } from 'react'
import { Combobox, ComboboxLabel, ComboboxOption, useComboboxDeferredQuery } from 'ui/combobox'
import { JsonTree } from 'ui/json-tree'
import {
	QueryBuilder,
	type QueryField,
	type QueryGroup,
	QuerySummary,
	type QueryValueEditorProps,
	QueryValueEditorProvider,
	setOperators,
} from 'ui/query'
import { Stack } from 'ui/stack'
import { type Person, profiles } from '../../../data/people.ts'

/** The name of the person with `id`, as the label of a key in the query. */
function ownerName(id: string | number): string | undefined {
	return profiles.find((person) => person.id === Number(id))?.name
}

// The search of a server. It answers after a delay, and the next query aborts
// it, as the `search` of a chat source does.
function searchPeople(query: string, signal: AbortSignal): Promise<readonly Person[]> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			const text = query.trim().toLowerCase()

			resolve(profiles.filter((person) => person.name.toLowerCase().includes(text)).slice(0, 8))
		}, 300)

		signal.addEventListener(
			'abort',
			() => {
				clearTimeout(timer)

				reject(signal.reason)
			},
			{ once: true },
		)
	})
}

function MatchingPeople() {
	const query = useComboboxDeferredQuery()

	const [people, setPeople] = useState<readonly Person[]>([])

	useEffect(() => {
		const controller = new AbortController()

		// An aborted search rejects, and its result does not land.
		searchPeople(query, controller.signal).then(setPeople, () => {})

		return () => controller.abort()
	}, [query])

	return people.map((person) => (
		<ComboboxOption key={person.id} value={person.id}>
			<ComboboxLabel>{person.name}</ComboboxLabel>
		</ComboboxOption>
	))
}

// The editor writes the ids of the people, not their names. The `formatValue`
// of the field gives the names to the summary.
function OwnerPicker({
	value,
	onValueChange,
	'aria-label': label,
	disabled,
	readOnly,
	className,
}: QueryValueEditorProps) {
	const ids = Array.isArray(value) ? value.filter((id): id is number => typeof id === 'number') : []

	return (
		<Combobox<number>
			multiple
			value={ids}
			onValueChange={onValueChange}
			displayValue={(id) => ownerName(id) ?? String(id)}
			placeholder="Search people"
			aria-label={label}
			disabled={disabled}
			readOnly={readOnly}
			className={className}
		>
			<MatchingPeople />
		</Combobox>
	)
}

const editors = { owner: OwnerPicker }

const fields: QueryField[] = [
	{ name: 'name', label: 'Name', type: 'text' },
	{
		name: 'owner',
		label: 'Owner',
		type: 'number',
		editor: 'owner',
		operators: [...setOperators],
		formatValue: ownerName,
	},
]

const start: QueryGroup = {
	id: 'root',
	type: 'group',
	combinator: 'and',
	children: [{ id: 'r1', type: 'rule', field: 'owner', operator: 'in', value: [1, 2] }],
}

export default function CustomEditor() {
	const [query, setQuery] = useState<QueryGroup>(start)

	// The Owner field names the editor by a key, and the provider maps the key
	// to the picker. The value of the rule is a set of ids.
	return (
		<QueryValueEditorProvider editors={editors}>
			<Stack gap="md">
				<QueryBuilder fields={fields} value={query} onValueChange={setQuery} />
				<QuerySummary value={query} fields={fields} />
				<JsonTree data={query} defaultExpandDepth={0} />
			</Stack>
		</QueryValueEditorProvider>
	)
}
