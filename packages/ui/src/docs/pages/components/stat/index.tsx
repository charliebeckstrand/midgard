import api from 'virtual:docs/api/components/stat'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import DashboardGrid from './dashboard-grid.tsx'
import StatPlayground from './playground.tsx'
import Trend from './trend.tsx'
import WithDeltaAndDescription from './with-delta-and-description.tsx'

export default function StatPage() {
	return (
		<>
			<Playground of={StatPlayground} api={api} />
			<Example of={Trend} />
			<Example of={WithDeltaAndDescription} />
			<Example of={DashboardGrid} surface />
			<ApiTable api={api} />
		</>
	)
}
