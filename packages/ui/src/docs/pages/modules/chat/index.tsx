import api from 'virtual:docs/api/modules/chat'
import { ApiTable, Example, PageTabs, Playground } from '../../../kit/index.ts'
import ChatPlayground from './playground.tsx'
import Timestamped from './timestamped.tsx'
import WithContextMenu from './with-context-menu.tsx'

const TABS = [
	'Message',
	'Transcript',
	'Conversation',
	'Embeds',
	'Citations',
	'Scope',
	'Steps',
	'List',
	'Prompt',
]

export default function ChatPage() {
	return (
		<>
			<PageTabs tabs={TABS}>
				<Playground of={ChatPlayground} api={api} />
				<Example of={Timestamped} />
				<Example of={WithContextMenu} />
			</PageTabs>
			<ApiTable api={api} />
		</>
	)
}
