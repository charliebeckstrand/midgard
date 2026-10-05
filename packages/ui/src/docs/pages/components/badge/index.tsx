import api from 'virtual:docs/api/components/badge'
import { ApiTable, Playground } from '../../../kit/index.ts'
import BadgePlayground from './playground.tsx'

export default function BadgePage() {
	return (
		<>
			<Playground of={BadgePlayground} api={api} />
			<ApiTable api={api} />
		</>
	)
}
