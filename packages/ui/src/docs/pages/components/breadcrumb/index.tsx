import api from 'virtual:docs/api/components/breadcrumb'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Collapse from './collapse.tsx'
import BreadcrumbPlayground from './playground.tsx'

export default function BreadcrumbPage() {
	return (
		<>
			<Playground of={BreadcrumbPlayground} api={api} />
			<Example of={Collapse} />
			<ApiTable api={api} />
		</>
	)
}
