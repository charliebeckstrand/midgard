import api from 'virtual:docs/api/modules/chat'
import { ApiTable, Example, FrameDefaults, PageTabs, Playground } from '../../../kit/index.ts'
import ChatPlayground from './playground.tsx'
import Timestamped from './timestamped.tsx'
import WithActions from './with-actions.tsx'
import WithContextMenu from './with-context-menu.tsx'

const TABS = [
	'Message',
	'Transcript',
	'Conversation',
	'Embeds',
	'Citations',
	'Scope',
	'Steps',
	'Actions',
	'List',
	'Prompt',
]

export default function ChatPage() {
	return (
		<>
			<PageTabs tabs={TABS}>
				{/* A message spans the row of a transcript, so each frame of the tab
				    fills the width. The bubble of each speaker then takes its side. */}
				<FrameDefaults box="surface">
					<Playground of={ChatPlayground} api={api} />
					<Example of={Timestamped} />
					<Example of={WithActions} />
					<Example of={WithContextMenu} />
				</FrameDefaults>
			</PageTabs>
			<ApiTable api={api} />
		</>
	)
}
