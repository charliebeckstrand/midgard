import { Example } from '../../../../kit/index.ts'
import Animated from './animated.tsx'
import SizeEncoding from './size-encoding.tsx'

export default function BubbleTab() {
	return (
		<>
			<Example of={SizeEncoding} surface />
			<Example of={Animated} surface />
		</>
	)
}
