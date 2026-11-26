import api from 'virtual:docs/api/components/badge'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import BadgePlayground from './playground.tsx'
import WithIcon from './with-icon.tsx'

export default function BadgePage() {
	return (
		<>
			<Playground of={BadgePlayground} api={api} />
			<Example of={WithIcon} />
			<ApiTable api={api} />
		</>
	)
}
