import { useState } from 'react'
import { ChatList, ChatListItem } from '../../../../modules/chat'
import { Example } from '../../../engine'

const conversations = [
	{ id: '1', title: 'Project kickoff', timestamp: '2h' },
	{ id: '2', title: 'Bug investigation', timestamp: '5h' },
	{ id: '3', title: 'Code review', timestamp: '1d' },
	{ id: '4', title: 'Architecture design', timestamp: '3d' },
]

function ConversationList() {
	const [current, setCurrent] = useState('1')

	return (
		<ChatList aria-label="Conversations" className="max-w-xs">
			{conversations.map((conversation) => (
				<ChatListItem
					key={conversation.id}
					title={conversation.title}
					current={conversation.id === current}
					onSelect={() => setCurrent(conversation.id)}
				/>
			))}
		</ChatList>
	)
}

export function Demo() {
	return (
		<Example title="Chat list">
			<ConversationList />
		</Example>
	)
}
