import { Example } from '../../../../kit/index.ts'
import Basic from './basic.tsx'
import CenterContent from './center-content.tsx'
import Majority from './majority.tsx'

export default function SeatTab() {
	return (
		<>
			<Example of={Basic} box="ratio" />
			<Example of={Majority} box="ratio" />
			<Example of={CenterContent} box="ratio" />
		</>
	)
}
