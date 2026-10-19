import api from 'virtual:docs/api/components/pivot-table'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import PivotTablePlayground from './playground.tsx'
import WithTotals from './with-totals.tsx'

export default function PivotTablePage() {
	return (
		<>
			<Playground of={PivotTablePlayground} api={api} omit={['bleed']} />
			<Example of={WithTotals} />
			<ApiTable api={api} />
		</>
	)
}
