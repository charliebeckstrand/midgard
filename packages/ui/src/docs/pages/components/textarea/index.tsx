import api from 'virtual:docs/api/components/textarea'
import { ApiTable, Example, FrameDefaults, Playground } from '../../../kit/index.ts'
import MaxHeight from './max-height.tsx'
import TextareaPlayground from './playground.tsx'
import Validation from './validation.tsx'
import WithActions from './with-actions.tsx'

export default function TextareaPage() {
	return (
		<FrameDefaults box="column">
			<Playground of={TextareaPlayground} api={api} />
			<Example of={WithActions} />
			<Example of={MaxHeight} />
			<Example of={Validation} />
			<ApiTable api={api} />
		</FrameDefaults>
	)
}
