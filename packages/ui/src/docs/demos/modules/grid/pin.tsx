import { useState } from 'react'
import { Stack } from '../../../../components/stack'
import { Grid } from '../../../../modules/grid'
import { code, Example } from '../../../engine'
import { employeeColumns, employees } from './_employees'

const PinnedExample = () => (
	// The Name column freezes to the left and Status to the right; scroll the grid
	// sideways and they stay put while the middle columns slide beneath them.
	<Grid
		resizable
		header={{ position: 'sticky' }}
		maxHeight="320px"
		columns={employeeColumns}
		rows={employees}
		getKey={(row) => row.id}
	/>
)

const PinnedSelectionExample = () => {
	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	// The selection column always freezes to the far left, ahead of the
	// left-pinned Name column: scroll the grid sideways and the row checkboxes stay
	// anchored at the edge while the middle columns slide beneath them.
	return (
		<Grid
			resizable
			header={{ position: 'sticky' }}
			maxHeight="320px"
			columns={[{ id: 'select', selectable: true }, ...employeeColumns]}
			rows={employees}
			getKey={(row) => row.id}
			selection={{ value: selection, onValueChange: (s) => setSelection(s ?? new Set()) }}
		/>
	)
}

export function Demo() {
	return (
		<Stack gap="xl">
			<Example
				title="Pinned columns"
				code={code`<Grid columns={[{ ...col, pinned: 'left' }, { ...col, pinned: 'right' }]} />`}
			>
				<PinnedExample />
			</Example>

			<Example
				title="Pinned selection"
				code={code`<Grid columns={[{ id: 'select', selectable: true }, ...pinnedColumns]} />`}
			>
				<PinnedSelectionExample />
			</Example>
		</Stack>
	)
}
