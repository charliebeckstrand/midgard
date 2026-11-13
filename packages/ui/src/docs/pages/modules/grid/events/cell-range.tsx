import { Grid } from 'ui/grid'
import { Text } from 'ui/text'
import { PointerHint } from '../../../../kit/pointer-hint.tsx'
import { columns, people } from '../data.tsx'

export default function CellRange() {
	// Shift with an arrow key or a click extends the range, and a drag makes
	// one. Ctrl+C or Cmd+C copies it as TSV. Escape ends the range.
	return (
		<>
			<Text tone="muted">
				<PointerHint
					mouseText="Shift-click or drag across the cells to select a range"
					touchText="Use a keyboard or a mouse to select a range of cells"
				/>
			</Text>
			<Grid navigable range columns={columns} rows={people} getKey={(row) => row.id} />
		</>
	)
}
