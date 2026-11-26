import api from 'virtual:docs/api/layouts/stacked'
import { ApiTable, Example } from '../../../kit/index.ts'
import ScrollingBody from './scrolling-body.tsx'

export default function StackedLayoutPage() {
	return (
		<>
			<Example of={ScrollingBody} viewport page />
			<ApiTable api={api} />
		</>
	)
}
