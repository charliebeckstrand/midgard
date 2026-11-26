import api from 'virtual:docs/api/components/list'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import HandleAtTheEnd from './handle-at-the-end.tsx'
import Horizontal from './horizontal.tsx'
import InteractiveRows from './interactive-rows.tsx'
import ListPlayground from './playground.tsx'
import Sortable from './sortable.tsx'
import WithDescriptions from './with-descriptions.tsx'

export default function ListPage() {
	return (
		<>
			<Playground of={ListPlayground} api={api} omit={['handle', 'virtualize', 'disabled']} />
			<Example of={InteractiveRows} />
			<Example of={Sortable} />
			<Example of={HandleAtTheEnd} />
			<Example of={Horizontal} />
			<Example of={WithDescriptions} />
			<ApiTable api={api} />
		</>
	)
}
