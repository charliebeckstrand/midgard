import { Example } from '../../../../kit/index.ts'
import Basic from './basic.tsx'
import CenterContent from './center-content.tsx'
import Majority from './majority.tsx'

export default function SeatTab() {
	return (
		<>
			<Example of={Basic} />
			<Example of={Majority} />
			<Example of={CenterContent} />
		</>
	)
}
