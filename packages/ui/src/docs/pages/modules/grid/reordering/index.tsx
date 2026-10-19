import { Example } from '../../../../kit/index.ts'
import ColumnReorderWithHandle from './column-reorder-with-handle.tsx'
import ColumnReorderWithoutHandle from './column-reorder-without-handle.tsx'
import RowReorder from './row-reorder.tsx'

export default function ReorderTab() {
	return (
		<>
			<Example of={ColumnReorderWithHandle} />
			<Example of={ColumnReorderWithoutHandle} />
			<Example of={RowReorder} />
		</>
	)
}
