import api from 'virtual:docs/api/components/table'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import CaptionAndTotals from './caption-and-totals.tsx'
import Empty from './empty.tsx'
import Loading from './loading.tsx'
import TablePlayground from './playground.tsx'

export default function TablePage() {
	return (
		<>
			<Playground of={TablePlayground} api={api} omit={['bleed']} />
			<Example of={CaptionAndTotals} />
			<Example of={Loading} />
			<Example of={Empty} />
			<ApiTable api={api} />
		</>
	)
}
