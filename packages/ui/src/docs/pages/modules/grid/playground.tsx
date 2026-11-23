import { Grid, type GridProps } from 'ui/grid'
import { columns, type Person, people } from './data.tsx'

export default function GridPlayground(props: GridProps<Person>) {
	return (
		<Grid
			tableProps={{ 'aria-label': 'Playground' }}
			{...props}
			columns={columns.slice(0, 3)}
			rows={people.slice(0, 3)}
			getKey={(row) => row.id}
		/>
	)
}
