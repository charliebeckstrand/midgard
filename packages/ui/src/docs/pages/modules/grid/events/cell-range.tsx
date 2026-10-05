import { Grid } from 'ui/grid'
import { columns, people } from '../data.tsx'

export default function CellRange() {
	// Shift with an arrow key or a click extends the range, and a drag makes
	// one. Ctrl+C or Cmd+C copies it as TSV. Escape ends the range.
	return <Grid navigable range columns={columns} rows={people} getKey={(row) => row.id} />
}
