import api from 'virtual:docs/api/components/table'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Empty from './empty.tsx'
import Loading from './loading.tsx'
import TablePlayground from './playground.tsx'

export default function TablePage() {
	return (
		<>
			<Playground of={TablePlayground} api={api} omit={['bleed']} />
			<Example of={Loading} />
			<Example of={Empty} />
			<ApiTable api={api} />
		</>
	)
}
