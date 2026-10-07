import api from 'virtual:docs/api/components/input'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Clearable from './clearable.tsx'
import Disabled from './disabled.tsx'
import InputPlayground from './playground.tsx'
import ReadOnly from './read-only.tsx'
import Validation from './validation.tsx'
import WithPrefix from './with-prefix.tsx'
import WithSuffix from './with-suffix.tsx'

export default function InputPage() {
	return (
		<>
			<Playground of={InputPlayground} api={api} />
			<Example of={WithPrefix} />
			<Example of={WithSuffix} />
			<Example of={Clearable} />
			<Example of={Validation} />
			<Example of={Disabled} />
			<Example of={ReadOnly} />
			<ApiTable api={api} />
		</>
	)
}
