import api from 'virtual:docs/api/components/number-input'
import { ApiTable, Example, FrameDefaults, Playground } from '../../../kit/index.ts'
import Controlled from './controlled.tsx'
import DecimalStep from './decimal-step.tsx'
import Disabled from './disabled.tsx'
import NumberInputPlayground from './playground.tsx'
import Validation from './validation.tsx'
import Width from './width.tsx'
import WithPrefix from './with-prefix.tsx'

export default function NumberInputPage() {
	return (
		<FrameDefaults box="column">
			<Playground of={NumberInputPlayground} api={api} />
			<Example of={Controlled} />
			<Example of={DecimalStep} />
			<Example of={WithPrefix} />
			<Example of={Width} />
			<Example of={Validation} />
			<Example of={Disabled} />
			<ApiTable api={api} />
		</FrameDefaults>
	)
}
