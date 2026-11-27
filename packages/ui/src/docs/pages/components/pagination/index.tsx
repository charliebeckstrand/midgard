import api from 'virtual:docs/api/components/pagination'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Links from './links.tsx'
import PaginationPlayground from './playground.tsx'

export default function PaginationPage() {
	return (
		<>
			<Playground of={PaginationPlayground} api={api} />
			<Example of={Links} />
			<ApiTable api={api} />
		</>
	)
}
