import api from 'virtual:docs/api/components/placeholder'
import { ApiTable, Playground } from '../../../kit/index.ts'
import PlaceholderPlayground from './playground.tsx'

export default function PlaceholderPage() {
	return (
		<>
			<Playground of={PlaceholderPlayground} api={api} omit={['as']} />
			<ApiTable api={api} />
		</>
	)
}
