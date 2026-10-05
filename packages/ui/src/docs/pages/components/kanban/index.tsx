import api from 'virtual:docs/api/components/kanban'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import KanbanPlayground from './playground.tsx'
import ReadOnly from './read-only.tsx'

export default function KanbanPage() {
	return (
		<>
			<Playground of={KanbanPlayground} api={api} />
			<Example of={ReadOnly} />
			<ApiTable api={api} />
		</>
	)
}
