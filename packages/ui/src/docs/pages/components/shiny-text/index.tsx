import api from 'virtual:docs/api/components/shiny-text'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Colors from './colors.tsx'
import ShinyTextPlayground from './playground.tsx'
import Speed from './speed.tsx'
import Spread from './spread.tsx'

export default function ShinyTextPage() {
	return (
		<>
			<Playground of={ShinyTextPlayground} api={api} />
			<Example of={Speed} />
			<Example of={Colors} />
			<Example of={Spread} />
			<ApiTable api={api} />
		</>
	)
}
