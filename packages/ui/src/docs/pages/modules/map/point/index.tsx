import { Example } from '../../../../kit/index.ts'
import Basic from './basic.tsx'
import Clustering from './clustering.tsx'
import Shapes from './shapes.tsx'
import Zoomable from './zoomable.tsx'

export default function PointTab() {
	return (
		<>
			<Example of={Basic} ratio />
			<Example of={Clustering} ratio />
			<Example of={Shapes} ratio />
			<Example of={Zoomable} ratio />
		</>
	)
}
