import api from 'virtual:docs/api/components/group'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import ItemCount from './item-count.tsx'
import GroupPlayground from './playground.tsx'
import WithInputs from './with-inputs.tsx'

export default function GroupPage() {
	return (
		<>
			<Playground of={GroupPlayground} api={api} />
			<Example of={ItemCount} />
			<Example of={WithInputs} />
			<ApiTable api={api} />
		</>
	)
}
