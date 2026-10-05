import api from 'virtual:docs/api/components/hold-button'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Destructive from './destructive.tsx'
import Disabled from './disabled.tsx'
import Durations from './durations.tsx'
import HoldToConfirm from './hold-to-confirm.tsx'
import LifecycleCallbacks from './lifecycle-callbacks.tsx'
import HoldButtonPlayground from './playground.tsx'

export default function HoldButtonPage() {
	return (
		<>
			<Playground of={HoldButtonPlayground} api={api} />
			<Example of={HoldToConfirm} />
			<Example of={Destructive} />
			<Example of={Durations} />
			<Example of={LifecycleCallbacks} />
			<Example of={Disabled} />
			<ApiTable api={api} />
		</>
	)
}
