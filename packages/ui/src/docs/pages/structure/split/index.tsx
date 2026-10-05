import api from 'virtual:docs/api/structure/split'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import SplitPlayground from './playground.tsx'
import SidebarLayout from './sidebar-layout.tsx'
import Vertical from './vertical.tsx'

export default function SplitPage() {
	return (
		<>
			<Playground of={SplitPlayground} api={api} />
			<Example of={SidebarLayout} />
			<Example of={Vertical} />
			<ApiTable api={api} />
		</>
	)
}
