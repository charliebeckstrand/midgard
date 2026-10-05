import api from 'virtual:docs/api/components/password-input'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Disabled from './disabled.tsx'
import PasswordInputPlayground from './playground.tsx'
import ReadOnly from './read-only.tsx'
import Validation from './validation.tsx'
import WithPrefix from './with-prefix.tsx'

export default function PasswordInputPage() {
	return (
		<>
			<Playground of={PasswordInputPlayground} api={api} />
			<Example of={WithPrefix} />
			<Example of={Disabled} />
			<Example of={ReadOnly} />
			<Example of={Validation} />
			<ApiTable api={api} />
		</>
	)
}
