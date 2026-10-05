import api from 'virtual:docs/api/components/text'
import { ApiTable, Playground } from '../../../kit/index.ts'
import TextPlayground from './playground.tsx'

export default function TextPage() {
	return (
		<>
			<Playground of={TextPlayground} api={api} />
			<ApiTable api={api} />
		</>
	)
}
