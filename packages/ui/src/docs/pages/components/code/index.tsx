import api from 'virtual:docs/api/components/code'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import CodeBlockExample from './code-block.tsx'
import InlineWithText from './inline-with-text.tsx'
import CodePlayground from './playground.tsx'
import WithLanguage from './with-language.tsx'

export default function CodePage() {
	return (
		<>
			<Playground of={CodePlayground} api={api} />
			<Example of={InlineWithText} />
			<Example of={CodeBlockExample} />
			<Example of={WithLanguage} />
			<ApiTable api={api} />
		</>
	)
}
