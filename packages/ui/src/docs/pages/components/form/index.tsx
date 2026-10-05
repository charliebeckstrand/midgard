import api from 'virtual:docs/api/components/form'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Checkboxes from './checkboxes.tsx'
import ControlledValues from './controlled-values.tsx'
import FormPlayground from './playground.tsx'
import ServerErrors from './server-errors.tsx'
import SuccessAndFailure from './success-and-failure.tsx'
import UnsavedChanges from './unsaved-changes.tsx'
import Validation from './validation.tsx'

export default function FormPage() {
	return (
		<>
			<Playground of={FormPlayground} api={api} />
			<Example of={Validation} />
			<Example of={Checkboxes} />
			<Example of={ServerErrors} />
			<Example of={SuccessAndFailure} />
			<Example of={UnsavedChanges} />
			<Example of={ControlledValues} />
			<ApiTable api={api} />
		</>
	)
}
