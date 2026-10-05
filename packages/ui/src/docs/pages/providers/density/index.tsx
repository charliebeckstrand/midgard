import api from 'virtual:docs/api/providers/density'
import { ApiTable, Playground } from '../../../kit/index.ts'
import DensityPlayground from './playground.tsx'

export default function DensityPage() {
	return (
		<>
			<Playground of={DensityPlayground} api={api} surface />
			<ApiTable api={api} />
		</>
	)
}
