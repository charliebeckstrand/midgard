import { useState } from 'react'
import { ChatList, ChatListItem } from 'ui/chat'

const conversations = [
	{ id: '1', title: 'Monday route plan' },
	{ id: '2', title: 'Late stops on the north routes' },
	{ id: '3', title: 'Depot handover' },
	{ id: '4', title: 'Fuel costs' },
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
