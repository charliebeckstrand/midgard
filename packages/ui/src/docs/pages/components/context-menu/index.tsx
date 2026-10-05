import api from 'virtual:docs/api/components/context-menu'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Actions from './actions.tsx'
import Glass from './glass.tsx'
import ContextMenuPlayground from './playground.tsx'
import Submenus from './submenus.tsx'

export default function ContextMenuPage() {
	return (
		<>
			<Playground of={ContextMenuPlayground} api={api} omit={['capped']} />
			<Example of={Actions} />
			<Example of={Submenus} />
			<Example of={Glass} />
			<ApiTable api={api} />
		</>
	)
}
