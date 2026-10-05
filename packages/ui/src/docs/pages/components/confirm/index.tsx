import api from 'virtual:docs/api/components/confirm'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import CancelOrDismiss from './cancel-or-dismiss.tsx'
import Glass from './glass.tsx'
import ConfirmPlayground from './playground.tsx'
import WithBodyContent from './with-body-content.tsx'

export default function ConfirmPage() {
	return (
		<>
			<Playground of={ConfirmPlayground} api={api} omit={['open']} />
			<Example of={WithBodyContent} />
			<Example of={CancelOrDismiss} />
			<Example of={Glass} />
			<ApiTable api={api} />
		</>
	)
}
