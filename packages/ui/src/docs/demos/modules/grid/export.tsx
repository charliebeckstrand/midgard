import { useState } from 'react'
import { Stack } from '../../../../components/stack'
import { Grid } from '../../../../modules/grid'
import { code, Example } from '../../../engine'
import { filterableColumns, people } from './_data'

// `exportable` adds one item per export type to the header and cell right-click
// menus, plus an "Export" toolbar dropdown listing them; each downloads (or, for
// `print`, opens the print dialog over) the filtered/sorted rows — or just the
// selected rows when a selection is active — every column read through its
// `value`. `true` enables the full default set (CSV, Excel, print); an explicit
// array picks a subset instead.
const ExportExample = () => (
	<Grid
		exportable={['csv', 'excel']}
		columns={filterableColumns}
		rows={people}
		getKey={(row) => row.id}
	/>
)

// `selection` and `exportable` work together: when a selection is active, the
// export menu and context items only include the selected rows. The grid doesn't
// own the selection state, so the consumer must hold it and pass it back to the
// grid.
const ExportWithSelectionExample = () => {
	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	return (
		<Grid
			exportable={['csv', 'excel']}
			columns={[{ id: 'select', selectable: true }, ...filterableColumns]}
			rows={people}
			getKey={(row) => row.id}
			selection={{ value: selection, onValueChange: (s) => setSelection(s ?? new Set()) }}
		/>
	)
}

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Export" code={code`<Grid exportable={['csv', 'excel']} />`}>
				<ExportExample />
			</Example>

			<Example
				title="Export with selection"
				code={code`<Grid exportable={['csv', 'excel']} selection={{ value, onValueChange }} />`}
			>
				<ExportWithSelectionExample />
			</Example>
		</Stack>
	)
}
