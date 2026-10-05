import api from 'virtual:docs/api/components/toast'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import DismissReason from './dismiss-reason.tsx'
import MaxToasts from './max-toasts.tsx'
import Persist from './persist.tsx'
import ToastPlayground from './playground.tsx'
import Severity from './severity.tsx'
import WithAction from './with-action.tsx'

export default function ToastPage() {
	return (
		<>
			<Playground of={ToastPlayground} api={api} />
			<Example of={Severity} />
			<Example of={WithAction} />
			<Example of={Persist} />
			<Example of={DismissReason} />
			<Example of={MaxToasts} />
			<ApiTable api={api} />
		</>
	)
}
