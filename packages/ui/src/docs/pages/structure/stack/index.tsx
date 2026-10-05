import api from 'virtual:docs/api/structure/stack'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Column from './column.tsx'
import StackPlayground from './playground.tsx'
import Wrap from './wrap.tsx'

export default function StackPage() {
	return (
		<>
			<Playground of={StackPlayground} api={api} omit={['as', 'wrap']} />
			<Example of={Wrap} />
			<Example of={Column} />
			<ApiTable api={api} />
		</>
	)
}
