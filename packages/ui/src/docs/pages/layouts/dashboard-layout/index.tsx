import api from 'virtual:docs/api/layouts/dashboard'
import { ApiTable, Example } from '../../../kit/index.ts'
import FilterRail from './filter-rail.tsx'

export default function DashboardLayoutPage() {
	return (
		<>
			<Example of={FilterRail} viewport page />
			<ApiTable api={api} />
		</>
	)
}
