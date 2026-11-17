import { Grid } from 'ui/grid'
import { filterableColumns, people } from '../data.tsx'

export default function WithFilenames() {
	// A `filename` names the file of a CSV or Excel download, in place of
	// `grid.csv` or `grid.xlsx`.
	return (
		<Grid
			exportable={{
				types: [{ csv: { filename: 'people.csv' }, excel: { filename: 'people.xlsx' } }],
				toolbar: true,
			}}
			columns={filterableColumns}
			rows={people}
			getKey={(row) => row.id}
		/>
	)
}
