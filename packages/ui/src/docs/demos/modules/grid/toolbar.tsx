import { Stack } from '../../../../components/stack'
import { Grid } from '../../../../modules/grid'
import { Example } from '../../../engine'
import { columns, people } from './_data'

const ColumnManagerExample = () => {
	// Column management is on by default (the header right-click menu's "Manage
	// columns" opens the dialog); `toolbarButton` adds the standalone button
	// shown here. Toggle a column's checkbox to hide it, or use a row's pin control
	// to freeze it left/right (left columns sort to the top of the list, right
	// columns to the bottom). Drag-to-reorder in the manager follows `reorder`, so
	// it's set here to enable the handles. Pass `columnManager={{ enabled: false }}`
	// to turn management off entirely.
	return (
		<Grid
			reorder
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			columnManager={{ toolbarButton: true }}
		/>
	)
}

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Column manager">
				<ColumnManagerExample />
			</Example>
		</Stack>
	)
}
