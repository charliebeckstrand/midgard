import api from 'virtual:docs/api/components/timeline'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import ItemStatus from './item-status.tsx'
import PerItemVariant from './per-item-variant.tsx'
import TimelinePlayground from './playground.tsx'

export default function TimelinePage() {
	return (
		<>
			<Playground of={TimelinePlayground} api={api} />
			<Example of={ItemStatus} />
			<Example of={PerItemVariant} />
			<ApiTable api={api} />
		</>
	)
}
