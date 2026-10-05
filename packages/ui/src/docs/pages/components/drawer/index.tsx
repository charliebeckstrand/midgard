import api from 'virtual:docs/api/components/drawer'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import FitContent from './fit-content.tsx'
import DrawerPlayground from './playground.tsx'
import StaticDrawer from './static-drawer.tsx'

export default function DrawerPage() {
	return (
		<>
			<Playground
				of={DrawerPlayground}
				api={api}
				omit={['open', 'defaultOpen', 'animateOnMount']}
			/>
			<Example of={FitContent} />
			<Example of={StaticDrawer} />
			<ApiTable api={api} />
		</>
	)
}
