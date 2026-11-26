import api from 'virtual:docs/api/primitives/intl'
import { ApiTable, Example } from '../../../kit/index.ts'
import ServerModule from './server-module.tsx'
import TranslateMessages from './translate-messages.tsx'

export default function IntlPage() {
	return (
		<>
			<Example of={TranslateMessages} />
			<Example of={ServerModule} />
			<ApiTable api={api} />
		</>
	)
}
