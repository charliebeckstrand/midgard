import { Example } from '../../../../kit/index.ts'
import Animated from './animated.tsx'
import MultiSeries from './multi-series.tsx'

export default function ScatterTab() {
	return (
		<>
			<Example of={MultiSeries} surface />
			<Example of={Animated} surface />
		</>
	)
}
