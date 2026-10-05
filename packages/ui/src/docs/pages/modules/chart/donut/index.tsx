import { Example } from '../../../../kit/index.ts'
import Animated from './animated.tsx'
import Basic from './basic.tsx'
import CenterContent from './center-content.tsx'

export default function DonutTab() {
	return (
		<>
			<Example of={Basic} surface />
			<Example of={CenterContent} surface />
			<Example of={Animated} surface />
		</>
	)
}
