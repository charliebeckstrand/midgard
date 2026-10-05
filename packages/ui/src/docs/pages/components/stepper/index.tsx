import api from 'virtual:docs/api/components/stepper'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import StepperPlayground from './playground.tsx'
import ReadOnly from './read-only.tsx'
import WithContentPanels from './with-content-panels.tsx'

export default function StepperPage() {
	return (
		<>
			<Playground of={StepperPlayground} api={api} omit={['mount']} />
			<Example of={WithContentPanels} />
			<Example of={ReadOnly} />
			<ApiTable api={api} />
		</>
	)
}
