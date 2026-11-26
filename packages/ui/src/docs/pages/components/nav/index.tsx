import api from 'virtual:docs/api/components/nav'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Links from './links.tsx'
import NavBarExample from './nav-bar.tsx'
import NavPlayground from './playground.tsx'
import WithContent from './with-content.tsx'
import WithIcons from './with-icons.tsx'

export default function NavPage() {
	return (
		<>
			<Playground of={NavPlayground} api={api} />
			<Example of={WithIcons} />
			<Example of={Links} />
			<Example of={NavBarExample} />
			<Example of={WithContent} />
			<ApiTable api={api} />
		</>
	)
}
