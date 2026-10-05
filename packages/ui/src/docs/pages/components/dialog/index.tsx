import api from 'virtual:docs/api/components/dialog'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import LongContent from './long-content.tsx'
import DialogPlayground from './playground.tsx'
import WithForm from './with-form.tsx'

export default function DialogPage() {
	return (
		<>
			<Playground of={DialogPlayground} api={api} omit={['open', 'defaultOpen']} />
			<Example of={WithForm} />
			<Example of={LongContent} />
			<ApiTable api={api} />
		</>
	)
}
