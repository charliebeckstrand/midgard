import api from 'virtual:docs/api/components/radio'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Controlled from './controlled.tsx'
import DisabledOption from './disabled-option.tsx'
import RadioPlayground from './playground.tsx'
import WithDescriptions from './with-descriptions.tsx'

export default function RadioPage() {
	return (
		<>
			<Playground of={RadioPlayground} api={api} />
			<Example of={WithDescriptions} />
			<Example of={Controlled} />
			<Example of={DisabledOption} />
			<ApiTable api={api} />
		</>
	)
}
