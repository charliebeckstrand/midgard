import api from 'virtual:docs/api/components/progress'
import { Example, Playground } from '../../../../kit/index.ts'
import Color from './color.tsx'
import ProgressGaugePlayground from './playground.tsx'
import Size from './size.tsx'

export default function GaugeTab() {
	return (
		<>
			<Playground of={ProgressGaugePlayground} api={api} free={{ value: 60 }} />
			<Example of={Color} />
			<Example of={Size} />
		</>
	)
}
