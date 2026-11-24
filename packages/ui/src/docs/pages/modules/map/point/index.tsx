import { Example } from '../../../../kit/index.ts'
import Basic from './basic.tsx'
import Clustering from './clustering.tsx'
import OverviewInset from './overview-inset.tsx'
import Shapes from './shapes.tsx'
import TintedGround from './tinted-ground.tsx'
import Zoomable from './zoomable.tsx'

export default function PointTab() {
	return (
		<>
			<Example of={Basic} box="ratio" />
			<Example of={Clustering} box="ratio" />
			<Example of={Shapes} box="ratio" />
			<Example of={TintedGround} box="ratio" />
			<Example of={Zoomable} box="ratio" />
			<Example of={OverviewInset} box="ratio" />
		</>
	)
}
