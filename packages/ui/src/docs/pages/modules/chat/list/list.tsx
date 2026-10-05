import { useState } from 'react'
import { ChatList, ChatListItem } from 'ui/chat'

const conversations = [
	{ id: '1', title: 'Project kickoff' },
	{ id: '2', title: 'Bug investigation' },
	{ id: '3', title: 'Code review' },
	{ id: '4', title: 'Architecture design' },
]

export default function List() {
	const [current, setCurrent] = useState('1')

	return (
		<ChatList aria-label="Conversations">
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
