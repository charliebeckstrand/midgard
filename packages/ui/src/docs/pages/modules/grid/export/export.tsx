import { Grid } from 'ui/grid'
import { filterableColumns, people } from '../data.tsx'

export default function Export() {
	// Each export type is an item in the right-click menus, and `toolbar` adds
	// an Export menu. An export takes the rows that show, in their order.
	return (
		<Grid
			exportable={{ types: ['csv', 'excel'], toolbar: true }}
			columns={filterableColumns}
			rows={people}
			getKey={(row) => row.id}
		/>
	)
}
