import api from 'virtual:docs/api/components/heading'
import { ApiTable, Playground } from '../../../kit/index.ts'
import HeadingPlayground from './playground.tsx'

export default function HeadingPage() {
	return (
		<>
			<Playground of={HeadingPlayground} api={api} start={{ level: 2 }} />
			<ApiTable api={api} />
		</>
	)
}
