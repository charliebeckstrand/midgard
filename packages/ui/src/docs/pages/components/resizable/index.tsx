import api from 'virtual:docs/api/components/resizable'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import ResizablePlayground from './playground.tsx'
import ThreePanels from './three-panels.tsx'

export default function ResizablePage() {
	return (
		<>
			<Playground of={ResizablePlayground} api={api} />
			<Example of={ThreePanels} />
			<ApiTable api={api} />
		</>
	)
}
