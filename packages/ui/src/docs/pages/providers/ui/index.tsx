import api from 'virtual:docs/api/providers/ui'
import { ApiTable, Example } from '../../../kit/index.ts'
import DefaultLinkComponent from './default-link-component.tsx'
import RegisteredLinkComponent from './registered-link-component.tsx'
import ReplacedIcons from './replaced-icons.tsx'

export default function UIPage() {
	return (
		<>
			<Example of={DefaultLinkComponent} />
			<Example of={RegisteredLinkComponent} />
			<Example of={ReplacedIcons} />
			<ApiTable api={api} />
		</>
	)
}
