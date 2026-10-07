import api from 'virtual:docs/api/components/drawer'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import FitContent from './fit-content.tsx'
import DrawerPlayground from './playground.tsx'

export default function DrawerPage() {
	return (
		<>
			<Playground of={DrawerPlayground} api={api} />
			<Example of={FitContent} />
			<ApiTable api={api} />
		</>
	)
}
