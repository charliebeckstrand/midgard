import { Example } from '../../../../kit/index.ts'
import Animated from './animated.tsx'
import MultiSeries from './multi-series.tsx'

export default function ScatterTab() {
	return (
		<>
			<Example of={MultiSeries} ratio />
			<Example of={Animated} ratio />
		</>
	)
}
