import api from 'virtual:docs/api/components/toolbar'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import ToolbarPlayground from './playground.tsx'
import WithGroups from './with-groups.tsx'
import WithMore from './with-more.tsx'

export default function ToolbarPage() {
	return (
		<>
			<Playground of={ToolbarPlayground} api={api} omit={['overflow']} />
			<Example of={WithGroups} />
			<Example of={WithMore} />
			<ApiTable api={api} />
		</>
	)
}
