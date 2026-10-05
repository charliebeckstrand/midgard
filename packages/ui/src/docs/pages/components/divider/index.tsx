import api from 'virtual:docs/api/components/divider'
import { ApiTable, Playground } from '../../../kit/index.ts'
import DividerPlayground from './playground.tsx'

export default function DividerPage() {
	return (
		<>
			<Playground of={DividerPlayground} api={api} />
			<ApiTable api={api} />
		</>
	)
}
