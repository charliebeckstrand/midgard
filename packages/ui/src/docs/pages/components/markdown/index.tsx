import api from 'virtual:docs/api/components/markdown'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Highlights from './highlights.tsx'
import MarkdownPlayground from './playground.tsx'

export default function MarkdownPage() {
	return (
		<>
			<Playground of={MarkdownPlayground} api={api} omit={['headingOffset']} />
			<Example of={Highlights} />
			<ApiTable api={api} />
		</>
	)
}
