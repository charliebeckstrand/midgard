import api from 'virtual:docs/api/components/description-list'
import { ApiTable, Playground } from '../../../kit/index.ts'
import DescriptionListPlayground from './playground.tsx'

export default function DescriptionListPage() {
	return (
		<>
			<Playground of={DescriptionListPlayground} api={api} />
			<ApiTable api={api} />
		</>
	)
}
