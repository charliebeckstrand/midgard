import { Example } from '../../../../kit/index.ts'
import Animated from './animated.tsx'
import SingleSeries from './single-series.tsx'
import SmoothInterpolation from './smooth-interpolation.tsx'

export default function AreaTab() {
	return (
		<>
			<Example of={SingleSeries} ratio />
			<Example of={SmoothInterpolation} ratio />
			<Example of={Animated} ratio />
		</>
	)
}
