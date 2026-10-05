import { Example } from '../../../../kit/index.ts'
import CellClick from './cell-click.tsx'
import CellRange from './cell-range.tsx'
import DoubleClick from './double-click.tsx'
import RowClick from './row-click.tsx'

export default function EventsTab() {
	return (
		<>
			<Example of={RowClick} />
			<Example of={CellClick} />
			<Example of={DoubleClick} />
			<Example of={CellRange} />
		</>
	)
}
