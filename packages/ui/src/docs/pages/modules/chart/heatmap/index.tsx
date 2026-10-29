import { Example } from '../../../../kit/index.ts'
import Activity from './activity.tsx'
import Animated from './animated.tsx'

export default function HeatmapTab() {
	return (
		<>
			<Example of={Activity} ratio />
			<Example of={Animated} ratio />
		</>
	)
}
