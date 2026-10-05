import api from 'virtual:docs/api/modules/query'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Builder from './builder.tsx'
import Chips from './chips.tsx'
import QueryPlayground from './playground.tsx'
import ReadOnlyAndDisabled from './read-only-and-disabled.tsx'
import Reorder from './reorder.tsx'

export default function QueryPage() {
	return (
		<>
			<Playground of={QueryPlayground} api={api} omit={['reorder']} />
			<Example of={Builder} />
			<Example of={Chips} />
			<Example of={ReadOnlyAndDisabled} />
			<Example of={Reorder} />
			<ApiTable api={api} />
		</>
	)
}
