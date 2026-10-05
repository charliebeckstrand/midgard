import api from 'virtual:docs/api/components/progress'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import GaugeColor from './gauge-color.tsx'
import GaugeSize from './gauge-size.tsx'
import ProgressPlayground from './playground.tsx'
import Value from './value.tsx'
import WithLabel from './with-label.tsx'

export default function ProgressPage() {
	return (
		<>
			<Playground of={ProgressPlayground} api={api} />
			<Example of={Value} />
			<Example of={GaugeSize} />
			<Example of={GaugeColor} />
			<Example of={WithLabel} />
			<ApiTable api={api} />
		</>
	)
}
