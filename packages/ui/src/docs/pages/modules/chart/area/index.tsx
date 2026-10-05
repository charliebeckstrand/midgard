import { Example } from '../../../../kit/index.ts'
import Animated from './animated.tsx'
import SingleSeries from './single-series.tsx'
import SmoothInterpolation from './smooth-interpolation.tsx'

export default function AreaTab() {
	return (
		<>
			<Example of={SingleSeries} surface />
			<Example of={SmoothInterpolation} surface />
			<Example of={Animated} surface />
		</>
	)
}
