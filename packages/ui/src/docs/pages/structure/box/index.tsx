import api from 'virtual:docs/api/structure/box'
import { ApiTable, Playground } from '../../../kit/index.ts'
import BoxPlayground from './playground.tsx'

export default function BoxPage() {
	return (
		<>
			<Playground of={BoxPlayground} api={api} />
			<ApiTable api={api} />
		</>
	)
}
