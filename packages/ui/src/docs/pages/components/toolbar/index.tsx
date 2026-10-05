import api from 'virtual:docs/api/components/toolbar'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import ToolbarPlayground from './playground.tsx'
import WithGroups from './with-groups.tsx'

export default function ToolbarPage() {
	return (
		<>
			<Playground of={ToolbarPlayground} api={api} />
			<Example of={WithGroups} />
			<ApiTable api={api} />
		</>
	)
}
