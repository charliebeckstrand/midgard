import { Example } from '../../../../kit/index.ts'
import Animated from './animated.tsx'
import BarAndLine from './bar-and-line.tsx'
import DualAxis from './dual-axis.tsx'
import WithArea from './with-area.tsx'

export default function ComboTab() {
	return (
		<>
			<Example of={BarAndLine} />
			<Example of={WithArea} />
			<Example of={DualAxis} />
			<Example of={Animated} />
		</>
	)
}
