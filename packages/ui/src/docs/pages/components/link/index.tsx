import api from 'virtual:docs/api/components/link'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import External from './external.tsx'
import InlineWithText from './inline-with-text.tsx'
import LinkPlayground from './playground.tsx'

export default function LinkPage() {
	return (
		<>
			<Playground of={LinkPlayground} api={api} />
			<Example of={InlineWithText} />
			<Example of={External} />
			<ApiTable api={api} />
		</>
	)
}
