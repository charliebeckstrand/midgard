import { Example } from '../../../../kit/index.ts'
import AStepBehindTheAnswer from './a-step-behind-the-answer.tsx'
import EveryState from './every-state.tsx'

export default function StepsTab() {
	return (
		<>
			<Example of={AStepBehindTheAnswer} />
			<Example of={EveryState} />
		</>
	)
}
