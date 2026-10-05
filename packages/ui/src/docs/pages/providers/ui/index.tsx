import api from 'virtual:docs/api/providers/ui'
import { ApiTable, Example } from '../../../kit/index.ts'
import DefaultLinkComponent from './default-link-component.tsx'
import RegisteredLinkComponent from './registered-link-component.tsx'

export default function UIPage() {
	return (
		<>
			<Example of={DefaultLinkComponent} />
			<Example of={RegisteredLinkComponent} />
			<ApiTable api={api} />
		</>
	)
}
