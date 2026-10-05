import api from 'virtual:docs/api/components/switch'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Controlled from './controlled.tsx'
import Disabled from './disabled.tsx'
import SwitchPlayground from './playground.tsx'
import WithDescription from './with-description.tsx'

export default function SwitchPage() {
	return (
		<>
			<Playground of={SwitchPlayground} api={api} omit={['defaultChecked']} />
			<Example of={WithDescription} />
			<Example of={Controlled} />
			<Example of={Disabled} />
			<ApiTable api={api} />
		</>
	)
}
