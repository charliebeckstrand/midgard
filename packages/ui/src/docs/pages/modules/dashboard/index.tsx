import api from 'virtual:docs/api/modules/dashboard'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import BuildAndSave from './build-and-save.tsx'
import DashboardPlayground from './playground.tsx'
import Query from './query.tsx'

export default function DashboardPage() {
	return (
		<>
			<Playground of={DashboardPlayground} api={api} surface />
			<Example of={Query} surface />
			<Example of={BuildAndSave} surface />
			<ApiTable api={api} />
		</>
	)
}
