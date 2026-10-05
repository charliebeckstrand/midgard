import api from 'virtual:docs/api/components/collapse'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import CompoundApi from './compound-api.tsx'
import Controlled from './controlled.tsx'
import DefaultOpen from './default-open.tsx'
import CollapsePlayground from './playground.tsx'

export default function CollapsePage() {
	return (
		<>
			<Playground of={CollapsePlayground} api={api} omit={['open', 'defaultOpen', 'mount']} />
			<Example of={DefaultOpen} />
			<Example of={CompoundApi} />
			<Example of={Controlled} />
			<ApiTable api={api} />
		</>
	)
}
