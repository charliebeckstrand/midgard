import api from 'virtual:docs/api/components/scroll-area'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import BareNestedInAContainer from './bare-nested-in-a-container.tsx'
import HorizontalWithExtent from './horizontal-with-extent.tsx'
import ScrollAreaPlayground from './playground.tsx'
import VerticalWithExtent from './vertical-with-extent.tsx'

export default function ScrollAreaPage() {
	return (
		<>
			<Playground of={ScrollAreaPlayground} api={api} omit={['extent']} />
			<Example of={VerticalWithExtent} />
			<Example of={HorizontalWithExtent} />
			<Example of={BareNestedInAContainer} />
			<ApiTable api={api} />
		</>
	)
}
