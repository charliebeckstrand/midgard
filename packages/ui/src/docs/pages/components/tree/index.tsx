import api from 'virtual:docs/api/components/tree'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Checkboxes from './checkboxes.tsx'
import Nested from './nested.tsx'
import TreePlayground from './playground.tsx'
import RichContent from './rich-content.tsx'
import WithoutIcons from './without-icons.tsx'

export default function TreePage() {
	return (
		<>
			<Playground of={TreePlayground} api={api} omit={['mount']} />
			<Example of={Nested} />
			<Example of={RichContent} />
			<Example of={Checkboxes} />
			<Example of={WithoutIcons} />
			<ApiTable api={api} />
		</>
	)
}
