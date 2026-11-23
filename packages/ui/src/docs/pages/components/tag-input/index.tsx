import api from 'virtual:docs/api/components/tag-input'
import { ApiTable, Example, FrameDefaults, Playground } from '../../../kit/index.ts'
import Controlled from './controlled.tsx'
import Disabled from './disabled.tsx'
import MaxTags from './max-tags.tsx'
import TagInputPlayground from './playground.tsx'
import Validation from './validation.tsx'
import Wrap from './wrap.tsx'

export default function TagInputPage() {
	return (
		<FrameDefaults form>
			<Playground of={TagInputPlayground} api={api} />
			<Example of={Wrap} />
			<Example of={MaxTags} />
			<Example of={Validation} />
			<Example of={Controlled} />
			<Example of={Disabled} />
			<ApiTable api={api} />
		</FrameDefaults>
	)
}
