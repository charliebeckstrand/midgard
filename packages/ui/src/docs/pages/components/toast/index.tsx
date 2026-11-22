import api from 'virtual:docs/api/components/toast'
import { ApiTable, Example, FrameDefaults, Playground } from '../../../kit/index.ts'
import DismissReason from './dismiss-reason.tsx'
import MaxToasts from './max-toasts.tsx'
import Persist from './persist.tsx'
import ToastPlayground from './playground.tsx'
import Severity from './severity.tsx'
import WithAction from './with-action.tsx'
import WithId from './with-id.tsx'

export default function ToastPage() {
	return (
		<FrameDefaults viewport>
			<Playground of={ToastPlayground} api={api} />
			<Example of={Severity} />
			<Example of={WithAction} />
			<Example of={Persist} />
			<Example of={WithId} />
			<Example of={DismissReason} />
			<Example of={MaxToasts} />
			<ApiTable api={api} />
		</FrameDefaults>
	)
}
