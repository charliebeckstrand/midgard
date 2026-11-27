import api from 'virtual:docs/api/components/badge'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import AsLink from './as-link.tsx'
import BadgePlayground from './playground.tsx'
import WithIcon from './with-icon.tsx'

export default function BadgePage() {
	return (
		<>
			<Playground of={BadgePlayground} api={api} />
			<Example of={WithIcon} />
			<Example of={AsLink} />
			<ApiTable api={api} />
		</>
	)
}
