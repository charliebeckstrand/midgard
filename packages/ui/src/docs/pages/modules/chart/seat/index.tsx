import { Example } from '../../../../kit/index.ts'
import Basic from './basic.tsx'
import CenterContent from './center-content.tsx'
import Majority from './majority.tsx'

export default function SeatTab() {
	return (
		<>
			<Example of={Basic} ratio />
			<Example of={Majority} ratio />
			<Example of={CenterContent} ratio />
		</>
	)
}
