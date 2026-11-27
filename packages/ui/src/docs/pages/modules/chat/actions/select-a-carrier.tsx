import { useEffect, useRef, useState } from 'react'
import { type ChatActionResult, type ChatMessageData, ChatTranscript, useChatSend } from 'ui/chat'
import { agentTransport } from './reply.ts'

const carriers = [
	{ value: 'northline', label: 'Northline Freight', description: 'Pickup at 1 PM, $420' },
	{ value: 'atlas', label: 'Atlas Haulage', description: 'Pickup at 3 PM, $380' },
]

const initialMessages: ChatMessageData[] = [
	{ id: 'ask', sender: 'user', content: 'Who can take the Denver order on Thursday?' },
	{
		id: 'offer',
		sender: 'assistant',
		content: [
			{ kind: 'text', id: 'status', text: 'Two carriers can take the Denver order on Thursday.' },
			{
				kind: 'action',
				id: 'carrier',
				prompt: 'Which carrier should take it?',
				title: 'Carrier',
				success: 'Carrier selected',
				input: { kind: 'choice', name: 'carrier', options: carriers },
			},
		],
	},
]

// The agent replaces the line, because the answer settles it.
const revise = ({ result }: { result: ChatActionResult }) => {
	const carrier = carriers.find((option) => option.value === result.carrier)

	return {
		id: 'status',
		text: `${carrier?.label} takes the Denver order on Thursday. ${carrier?.description}.`,
	}
}

export default function SelectACarrier() {
	// The shown path, for the agent to revise an earlier message.
	const shown = useRef<readonly ChatMessageData[]>(initialMessages)
	const [transport] = useState(() => agentTransport(revise, () => shown.current))
	const chat = useChatSend({ transport, initialMessages })

	useEffect(() => {
		shown.current = chat.messages
	}, [chat.messages])

	return (
		<ChatTranscript
			messages={chat.messages}
			streaming={chat.streaming}
			onActionSubmit={chat.submitAction}
			className="h-96"
		/>
	)
}
