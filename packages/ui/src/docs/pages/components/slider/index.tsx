import api from 'virtual:docs/api/components/slider'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import ClampedRange from './clamped-range.tsx'
import Controlled from './controlled.tsx'
import DecimalStep from './decimal-step.tsx'
import Disabled from './disabled.tsx'
import SliderPlayground from './playground.tsx'
import Range from './range.tsx'

export default function SliderPage() {
	return (
		<>
			<Playground of={SliderPlayground} api={api} />
			<Example of={Controlled} />
			<Example of={DecimalStep} />
			<Example of={Range} />
			<Example of={ClampedRange} />
			<Example of={Disabled} />
			<ApiTable api={api} />
		</>
	)
}
