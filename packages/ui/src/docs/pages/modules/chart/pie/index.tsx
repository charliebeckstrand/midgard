import { Example } from '../../../../kit/index.ts'
import Animated from './animated.tsx'
import CalloutLabels from './callout-labels.tsx'
import LegendPlacement from './legend-placement.tsx'
import NoLabels from './no-labels.tsx'
import SegmentLabels from './segment-labels.tsx'

export default function PieTab() {
	return (
		<>
			<Example of={NoLabels} />
			<Example of={SegmentLabels} />
			<Example of={CalloutLabels} />
			<Example of={LegendPlacement} />
			<Example of={Animated} />
		</>
	)
}
