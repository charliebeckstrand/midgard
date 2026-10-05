import { Example } from '../../../../kit/index.ts'
import DepotCatchments from './depot-catchments.tsx'
import TexasTriangle from './texas-triangle.tsx'

export default function GeofenceTab() {
	return (
		<>
			<Example of={DepotCatchments} surface />
			<Example of={TexasTriangle} surface />
		</>
	)
}
