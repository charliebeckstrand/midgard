import { type ChatActionPart, type ChatMessageData, ChatTranscript, useChatSend } from 'ui/chat'
import { revisingTransport } from './reply.ts'

// The line that stays, and the line that the answer makes stale.
const status = {
	ready: 'The Denver order is ready at Dock 4.',
	stale: 'I can book it once the carrier has a contact.',
}

const details: ChatActionPart = {
	kind: 'action',
	id: 'details',
	prompt: 'Delivery details needed',
	title: 'Delivery details',
	success: 'Delivery details sent',
	input: {
		kind: 'form',
		label: 'Add details',
		fields: [
			{ kind: 'text', name: 'contact', label: 'Contact name', required: true },
			{ kind: 'text', name: 'phone', label: 'Phone', type: 'tel', required: true },
			{
				kind: 'choice',
				name: 'window',
				label: 'Pickup window',
				required: true,
				options: [
					{ value: 'morning', label: 'Thursday morning' },
					{ value: 'afternoon', label: 'Thursday afternoon' },
				],
			},
			{ kind: 'text', name: 'notes', label: 'Notes for the driver', multiline: true },
			{ kind: 'checkbox', name: 'liftgate', label: 'Needs a liftgate' },
		],
	},
}

const initialMessages: ChatMessageData[] = [
	{ id: 'ask', sender: 'user', content: 'Book a pickup for the Denver order.' },
	{
		id: 'offer',
		sender: 'assistant',
		content: [
			{
				kind: 'text',
				id: 'status',
				text: `${status.ready} ${status.stale}`,
			},
			details,
		],
	},
]

// The agent strikes the line that the answer makes stale, and writes the
// booking after it.
const transport = revisingTransport(({ result }) => [
	{
		kind: 'text',
		id: 'status',
		text: `${status.ready} ~~${status.stale}~~ Booked for Thursday ${
			result?.window === 'morning' ? 'morning' : 'afternoon'
		}. The driver calls ${result?.contact} on arrival.`,
	},
])

export default function BookAPickup() {
	const chat = useChatSend({ transport, initialMessages })

	return (
		<ChatTranscript
			messages={chat.messages}
			streaming={chat.streaming}
			onActionSubmit={chat.submitAction}
			className="h-96"
		/>
	)
}
