import api from 'virtual:docs/api/modules/wysiwyg'
import { ApiTable, Example, FrameDefaults, Playground } from '../../../kit/index.ts'
import Controlled from './controlled.tsx'
import MaxHeight from './max-height.tsx'
import WysiwygPlayground from './playground.tsx'
import ReadOnly from './read-only.tsx'
import Validation from './validation.tsx'
import WithActions from './with-actions.tsx'
import WithToolbar from './with-toolbar.tsx'

export default function WysiwygPage() {
	return (
		<FrameDefaults box="column">
			<Playground of={WysiwygPlayground} api={api} />
			<Example of={WithToolbar} />
			<Example of={Controlled} />
			<Example of={WithActions} />
			<Example of={MaxHeight} />
			<Example of={Validation} />
			<Example of={ReadOnly} />
			<ApiTable api={api} />
		</FrameDefaults>
	)
}
