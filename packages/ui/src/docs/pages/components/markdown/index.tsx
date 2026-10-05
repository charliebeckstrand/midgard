import api from 'virtual:docs/api/components/markdown'
import { ApiTable, Playground } from '../../../kit/index.ts'
import MarkdownPlayground from './playground.tsx'

export default function MarkdownPage() {
	return (
		<>
			<Playground of={MarkdownPlayground} api={api} />
			<ApiTable api={api} />
		</>
	)
}
