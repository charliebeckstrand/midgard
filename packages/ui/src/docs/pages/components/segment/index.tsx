import api from 'virtual:docs/api/components/segment'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import DisabledItem from './disabled-item.tsx'
import Filter from './filter.tsx'
import SegmentPlayground from './playground.tsx'
import SwitchViews from './switch-views.tsx'

export default function SegmentPage() {
	return (
		<>
			<Playground of={SegmentPlayground} api={api} />
			<Example of={SwitchViews} />
			<Example of={Filter} />
			<Example of={DisabledItem} />
			<ApiTable api={api} />
		</>
	)
}
