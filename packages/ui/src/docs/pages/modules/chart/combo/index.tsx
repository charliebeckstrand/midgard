import { Example } from '../../../../kit/index.ts'
import Animated from './animated.tsx'
import BarAndLine from './bar-and-line.tsx'
import BarAreaAndLine from './bar-area-and-line.tsx'
import DualAxis from './dual-axis.tsx'

export default function ComboTab() {
	return (
		<>
			<Example of={BarAndLine} surface />
			<Example of={BarAreaAndLine} surface />
			<Example of={DualAxis} surface />
			<Example of={Animated} surface />
		</>
	)
}
