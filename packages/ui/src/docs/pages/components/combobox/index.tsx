import api from 'virtual:docs/api/components/combobox'
import { ApiTable, Example, FrameDefaults, Playground } from '../../../kit/index.ts'
import Controlled from './controlled.tsx'
import Creatable from './creatable.tsx'
import CustomSummary from './custom-summary.tsx'
import ComboboxPlayground from './playground.tsx'
import Virtualized from './virtualized.tsx'
import WithDescriptions from './with-descriptions.tsx'

export default function ComboboxPage() {
	return (
		<FrameDefaults box="column">
			<Playground of={ComboboxPlayground} api={api} omit={['open', 'required']} />
			<Example of={Controlled} />
			<Example of={WithDescriptions} />
			<Example of={CustomSummary} />
			<Example of={Creatable} />
			<Example of={Virtualized} />
			<ApiTable api={api} />
		</FrameDefaults>
	)
}
