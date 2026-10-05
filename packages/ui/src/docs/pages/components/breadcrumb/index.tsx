import api from 'virtual:docs/api/components/breadcrumb'
import { ApiTable, Playground } from '../../../kit/index.ts'
import BreadcrumbPlayground from './playground.tsx'

export default function BreadcrumbPage() {
	return (
		<>
			<Playground of={BreadcrumbPlayground} api={api} />
			<ApiTable api={api} />
		</>
	)
}
