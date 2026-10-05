import api from 'virtual:docs/api/structure/container'
import { ApiTable, Playground } from '../../../kit/index.ts'
import ContainerPlayground from './playground.tsx'

export default function ContainerPage() {
	return (
		<>
			<Playground of={ContainerPlayground} api={api} omit={['size']} />
			<ApiTable api={api} />
		</>
	)
}
