import api from 'virtual:docs/api/components/combobox'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Controlled from './controlled.tsx'
import Creatable from './creatable.tsx'
import CustomSummary from './custom-summary.tsx'
import ComboboxPlayground from './playground.tsx'
import Virtualized from './virtualized.tsx'

export default function ComboboxPage() {
	return (
		<>
			<Playground of={ComboboxPlayground} api={api} omit={['open', 'required']} />
			<Example of={Controlled} />
			<Example of={CustomSummary} />
			<Example of={Creatable} />
			<Example of={Virtualized} />
			<ApiTable api={api} />
		</>
	)
}
