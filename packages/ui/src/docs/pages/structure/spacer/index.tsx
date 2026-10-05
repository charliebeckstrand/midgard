import api from 'virtual:docs/api/structure/spacer'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import BetweenGroups from './between-groups.tsx'
import SpacerPlayground from './playground.tsx'

export default function SpacerPage() {
	return (
		<>
			<Playground of={SpacerPlayground} api={api} />
			<Example of={BetweenGroups} />
			<ApiTable api={api} />
		</>
	)
}
