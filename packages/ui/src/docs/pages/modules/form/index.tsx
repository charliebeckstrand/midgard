import api from 'virtual:docs/api/modules/form'
import { ApiTable, Example, PageTabs, Playground } from '../../../kit/index.ts'
import Checkboxes from './checkboxes.tsx'
import ControlledValues from './controlled-values.tsx'
import ErrorSummary from './error-summary.tsx'
import FormPlayground from './playground.tsx'
import ServerErrors from './server-errors.tsx'
import SuccessAndFailure from './success-and-failure.tsx'
import UnsavedChanges from './unsaved-changes.tsx'
import Validation from './validation.tsx'

const TABS = ['Form', 'Filters']

export default function FormPage() {
	return (
		<>
			<PageTabs tabs={TABS}>
				<Playground of={FormPlayground} api={api} />
				<Example of={Validation} />
				<Example of={ErrorSummary} />
				<Example of={Checkboxes} />
				<Example of={ServerErrors} />
				<Example of={SuccessAndFailure} />
				<Example of={UnsavedChanges} />
				<Example of={ControlledValues} />
			</PageTabs>
			<ApiTable api={api} />
		</>
	)
}
