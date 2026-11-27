import { Grid, type GridColumn } from 'ui/grid'
import { Text } from 'ui/text'
import { PointerHint } from '../../../../kit/pointer-hint.tsx'
import { columns, type Person, people } from '../data.tsx'

const selectColumns: GridColumn<Person>[] = [{ id: 'select', selectable: true }, ...columns]

export default function Selection() {
	// Shift with a click selects the span from the last checked row.
	// `rowSelectable` disables the checkbox of an inactive person, and the span
	// and select-all skip that row.
	return (
		<>
			<Text tone="muted">
				<PointerHint
					mouseText="Shift-click a checkbox to select each row from the last one that you checked"
					touchText="Tap a checkbox to select its row"
				/>
			</Text>
			<Grid
				tableProps={{ 'aria-label': 'People' }}
				columns={selectColumns}
				rows={people}
				getKey={(row) => row.id}
				rowLabel={(row) => row.name}
				selection={{ rowSelectable: (row) => row.status === 'active' }}
			/>
		</>
	)
}
