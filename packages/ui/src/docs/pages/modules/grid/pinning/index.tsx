import { Example } from '../../../../kit/index.ts'
import PinnedColumns from './pinned-columns.tsx'
import PinnedSelection from './pinned-selection.tsx'

export default function PinTab() {
	return (
		<>
			<Example of={PinnedColumns} />
			<Example of={PinnedSelection} />
		</>
	)
}
