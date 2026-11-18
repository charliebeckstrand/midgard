import api from 'virtual:docs/api/components/dialog'
import { ApiTable, Example, FrameDefaults, Playground } from '../../../kit/index.ts'
import LongContent from './long-content.tsx'
import DialogPlayground from './playground.tsx'
import WithForm from './with-form.tsx'

export default function DialogPage() {
	return (
		<FrameDefaults viewport>
			<Playground of={DialogPlayground} api={api} />
			<Example of={WithForm} />
			<Example of={LongContent} />
			<ApiTable api={api} />
		</FrameDefaults>
	)
}
