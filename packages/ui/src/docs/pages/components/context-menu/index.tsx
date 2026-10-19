import api from 'virtual:docs/api/components/context-menu'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Glass from './glass.tsx'
import ContextMenuPlayground from './playground.tsx'
import Submenus from './submenus.tsx'
import WithActions from './with-actions.tsx'

export default function ContextMenuPage() {
	return (
		<>
			<Playground of={ContextMenuPlayground} api={api} omit={['capped']} />
			<Example of={WithActions} />
			<Example of={Submenus} />
			<Example of={Glass} />
			<ApiTable api={api} />
		</>
	)
}
