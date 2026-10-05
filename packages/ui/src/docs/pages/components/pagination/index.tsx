import api from 'virtual:docs/api/components/pagination'
import { ApiTable, Playground } from '../../../kit/index.ts'
import PaginationPlayground from './playground.tsx'

export default function PaginationPage() {
	return (
		<>
			<Playground of={PaginationPlayground} api={api} />
			<ApiTable api={api} />
		</>
	)
}
