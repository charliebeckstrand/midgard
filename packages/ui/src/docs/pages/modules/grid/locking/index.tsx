import { Example } from '../../../../kit/index.ts'
import LockedLeft from './locked-left.tsx'
import LockedOnBothEdges from './locked-on-both-edges.tsx'
import LockedWithPinnableColumns from './locked-with-pinnable-columns.tsx'

export default function LockTab() {
	return (
		<>
			<Example of={LockedLeft} />
			<Example of={LockedWithPinnableColumns} />
			<Example of={LockedOnBothEdges} />
		</>
	)
}
