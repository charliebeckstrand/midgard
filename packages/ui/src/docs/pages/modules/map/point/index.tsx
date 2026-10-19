import { Example } from '../../../../kit/index.ts'
import Basic from './basic.tsx'
import Clustering from './clustering.tsx'
import Shapes from './shapes.tsx'
import Zoomable from './zoomable.tsx'

export default function PointTab() {
	return (
		<>
			<Example of={Basic} surface />
			<Example of={Clustering} surface />
			<Example of={Shapes} surface />
			<Example of={Zoomable} surface />
		</>
	)
}
