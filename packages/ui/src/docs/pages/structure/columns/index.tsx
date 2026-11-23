import api from 'virtual:docs/api/structure/columns'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import ColumnsPlayground from './playground.tsx'
import Responsive from './responsive.tsx'
import Spanning from './spanning.tsx'

export default function ColumnsPage() {
	return (
		<>
			<Playground of={ColumnsPlayground} api={api} start={{ columns: 3 }} />
			<Example of={Responsive} />
			<Example of={Spanning} />
			<ApiTable api={api} />
		</>
	)
}
