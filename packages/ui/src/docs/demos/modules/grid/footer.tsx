import { useState } from 'react'
import { Stack } from '../../../../components/stack'
import { Grid } from '../../../../modules/grid'
import { code, Example } from '../../../engine'
import { columns, people, searchableColumns } from './_data'

// The opt-in `footer` summary bar renders a single leading count that swaps by
// precedence. `rowTotal` counts the full filtered extent (search below narrows it
// to "N of M rows visible"); `selectedTotal` replaces it in place with the live
// selection ("N of M rows selected") while a row is picked, its denominator
// keeping the visible context. A custom `content` slot, if given, sits trailing.
const FooterExample = () => {
	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	const [search, setSearch] = useState('')

	return (
		<Grid
			columns={[{ id: 'select', selectable: true }, ...searchableColumns]}
			rows={people}
			getKey={(row) => row.id}
			search={{ value: search, onValueChange: setSearch }}
			selection={{ value: selection, onValueChange: (s) => setSelection(s ?? new Set()) }}
			footer={{
				rowTotal: true,
				selectedTotal: true,
			}}
		/>
	)
}

// `rowTotal` alone: a plain count of the rendered rows, no selection or content.
const RowTotalExample = () => (
	<Grid columns={columns} rows={people} getKey={(row) => row.id} footer={{ rowTotal: true }} />
)

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Row total" code={code`<Grid footer={{ rowTotal: true }} />`}>
				<RowTotalExample />
			</Example>

			<Example
				title="Selection summary"
				code={code`<Grid footer={{ rowTotal: true, selectedTotal: true }} />`}
			>
				<FooterExample />
			</Example>
		</Stack>
	)
}
