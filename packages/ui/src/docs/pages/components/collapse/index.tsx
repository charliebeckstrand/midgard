import api from 'virtual:docs/api/components/collapse'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Controlled from './controlled.tsx'
import DefaultOpen from './default-open.tsx'
import CollapsePlayground from './playground.tsx'
import TriggerLabelFromState from './trigger-label.tsx'

export default function CollapsePage() {
	return (
		<>
			<Playground of={CollapsePlayground} api={api} omit={['open', 'mount']} />
			<Example of={DefaultOpen} />
			<Example of={TriggerLabelFromState} />
			<Example of={Controlled} />
			<ApiTable api={api} />
		</>
	)
}
