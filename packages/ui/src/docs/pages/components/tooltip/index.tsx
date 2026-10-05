import api from 'virtual:docs/api/components/tooltip'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Delay from './delay.tsx'
import Glass from './glass.tsx'
import HeldOpen from './held-open.tsx'
import InteractiveContent from './interactive-content.tsx'
import TooltipPlayground from './playground.tsx'

export default function TooltipPage() {
	return (
		<>
			<Playground of={TooltipPlayground} api={api} omit={['open']} />
			<Example of={InteractiveContent} />
			<Example of={Delay} />
			<Example of={HeldOpen} />
			<Example of={Glass} />
			<ApiTable api={api} />
		</>
	)
}
