import api from 'virtual:docs/api/structure/columns'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import ColumnsPlayground from './playground.tsx'
import Responsive from './responsive.tsx'

export default function ColumnsPage() {
	return (
		<>
			<Playground of={ColumnsPlayground} api={api} />
			<Example of={Responsive} />
			<ApiTable api={api} />
		</>
	)
}
