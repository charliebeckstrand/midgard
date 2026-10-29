import { Example } from '../../../../kit/index.ts'
import Animated from './animated.tsx'
import Basic from './basic.tsx'
import CenterContent from './center-content.tsx'

export default function DonutTab() {
	return (
		<>
			<Example of={Basic} ratio />
			<Example of={CenterContent} ratio />
			<Example of={Animated} ratio />
		</>
	)
}
