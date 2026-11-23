import api from 'virtual:docs/api/components/date-input'
import { ApiTable, Example, FrameDefaults, Playground } from '../../../kit/index.ts'
import Controlled from './controlled.tsx'
import Disabled from './disabled.tsx'
import InvalidMessage from './invalid-message.tsx'
import MinAndMax from './min-and-max.tsx'
import DateInputPlayground from './playground.tsx'

export default function DateInputPage() {
	return (
		<FrameDefaults form>
			<Playground of={DateInputPlayground} api={api} />
			<Example of={MinAndMax} />
			<Example of={InvalidMessage} />
			<Example of={Controlled} />
			<Example of={Disabled} />
			<ApiTable api={api} />
		</FrameDefaults>
	)
}
