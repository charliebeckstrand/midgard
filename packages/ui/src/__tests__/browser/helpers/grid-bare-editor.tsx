import { Badge } from '../../../components/badge'
import type { GridColumn } from '../../../modules/grid'

// The rows and the columns of `grid-edit-bare-editor.test.tsx` and of its forced
// half, `forced/grid-edit-bare-editor.test.tsx`.

type Row = { id: number; name: string; email: string; active: boolean }

export const rows: Row[] = [
	{ id: 1, name: 'Wade Cooper', email: 'wade@example.com', active: true },
	{ id: 2, name: 'Arlene McCoy', email: 'arlene@example.com', active: false },
]

// The Active column shows a badge, which is taller than a line of text, so
// the badge sets the height of the row at rest.
export const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	{ id: 'email', title: 'Email', field: 'email', cell: (row) => row.email },
	{
		id: 'active',
		title: 'Active',
		field: 'active',
		cell: (row) => <Badge>{row.active ? 'Active' : 'Inactive'}</Badge>,
	},
]
