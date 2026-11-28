import { Example } from '../../../../kit/index.ts'
import Basic from './basic.tsx'
import Clustering from './clustering.tsx'
import Shapes from './shapes.tsx'
import TintedGround from './tinted-ground.tsx'
import Zoomable from './zoomable.tsx'

export default function PointTab() {
	return (
		<>
			<Example of={Basic} />
			<Example of={Clustering} />
			<Example of={Shapes} />
			<Example of={TintedGround} />
			<Example of={Zoomable} />
		</>
	)
}
