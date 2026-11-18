import api from 'virtual:docs/api/components/drawer'
import { ApiTable, Example, FrameDefaults, Playground } from '../../../kit/index.ts'
import FitContent from './fit-content.tsx'
import DrawerPlayground from './playground.tsx'
import Resize from './resize.tsx'

export default function DrawerPage() {
	return (
		<FrameDefaults viewport>
			<Playground of={DrawerPlayground} api={api} />
			<Example of={FitContent} />
			<Example of={Resize} />
			<ApiTable api={api} />
		</FrameDefaults>
	)
}
