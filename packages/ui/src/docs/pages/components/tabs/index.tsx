import api from 'virtual:docs/api/components/tabs'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Animation from './animation.tsx'
import Controlled from './controlled.tsx'
import DisabledTab from './disabled-tab.tsx'
import KeepPanelState from './keep-panel-state.tsx'
import Overflow from './overflow.tsx'
import TabsPlayground from './playground.tsx'
import Preload from './preload.tsx'
import Skeleton from './skeleton.tsx'
import Stretch from './stretch.tsx'

export default function TabsPage() {
	return (
		<>
			<Playground of={TabsPlayground} api={api} />
			<Example of={Animation} />
			<Example of={Stretch} />
			<Example of={DisabledTab} />
			<Example of={Controlled} />
			<Example of={Overflow} />
			<Example of={KeepPanelState} />
			<Example of={Preload} />
			<Example of={Skeleton} />
			<ApiTable api={api} />
		</>
	)
}
