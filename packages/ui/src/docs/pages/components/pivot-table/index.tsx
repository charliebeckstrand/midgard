import api from 'virtual:docs/api/components/pivot-table'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import CostByLane from './cost-by-lane.tsx'
import PivotTablePlayground from './playground.tsx'

export default function PivotTablePage() {
	return (
		<>
			<Playground of={PivotTablePlayground} api={api} omit={['bleed']} />
			<Example of={CostByLane} />
			<ApiTable api={api} />
		</>
	)
}
