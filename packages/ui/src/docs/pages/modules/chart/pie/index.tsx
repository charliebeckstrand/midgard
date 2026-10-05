import { Example } from '../../../../kit/index.ts'
import Animated from './animated.tsx'
import CalloutLabels from './callout-labels.tsx'
import LegendPlacement from './legend-placement.tsx'
import NoLabels from './no-labels.tsx'
import SegmentLabels from './segment-labels.tsx'

export default function PieTab() {
	return (
		<>
			<Example of={NoLabels} surface />
			<Example of={SegmentLabels} surface />
			<Example of={CalloutLabels} surface />
			<Example of={LegendPlacement} surface />
			<Example of={Animated} surface />
		</>
	)
}
