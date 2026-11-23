import api from 'virtual:docs/api/modules/form'
import { ApiTable, Example, FrameDefaults, PageTabs, Playground } from '../../../kit/index.ts'
import Checkboxes from './checkboxes.tsx'
import ControlledValues from './controlled-values.tsx'
import ErrorSummary from './error-summary.tsx'
import FormErrorExample from './form-error.tsx'
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
				<FrameDefaults form>
					<Playground of={FormPlayground} api={api} />
					<Example of={Validation} />
					<Example of={ErrorSummary} />
					<Example of={Checkboxes} />
					<Example of={ServerErrors} />
					<Example of={FormErrorExample} />
					<Example of={SuccessAndFailure} />
					<Example of={UnsavedChanges} />
					<Example of={ControlledValues} />
				</FrameDefaults>
			</PageTabs>
			<ApiTable api={api} />
		</>
	)
}
