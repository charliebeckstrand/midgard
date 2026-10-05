import api from 'virtual:docs/api/components/status'
import { ApiTable, Playground } from '../../../kit/index.ts'
import StatusPlayground from './playground.tsx'

export default function StatusPage() {
	return (
		<>
			<Playground of={StatusPlayground} api={api} />
			<ApiTable api={api} />
		</>
	)
}
