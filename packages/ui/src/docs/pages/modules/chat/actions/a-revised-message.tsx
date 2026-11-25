import { type ChatMessageData, ChatTranscript } from 'ui/chat'

const messages: ChatMessageData[] = [
	{ id: 'ask', sender: 'user', content: 'Book a pickup for the Denver order.' },
	{
		id: 'offer',
		sender: 'assistant',
		content: [
			{
				kind: 'text',
				id: 'status',
				text: 'The Denver order is ready at Dock 4. ~~I can book it once the carrier has a contact.~~ Booked for Thursday afternoon. The driver calls Dana Ortiz on arrival.',
			},
		],
		// The content before the revision, with the answered ask. The "(revised)"
		// button opens it, and each control in it draws read-only.
		versions: [
			[
				{
					kind: 'text',
					id: 'status',
					text: 'The Denver order is ready at Dock 4. I can book it once the carrier has a contact.',
				},
				{
					kind: 'action',
					id: 'details',
					prompt: 'Delivery details needed',
					title: 'Delivery details',
					success: 'Delivery details sent',
					input: {
						kind: 'form',
						label: 'Add details',
						fields: [{ kind: 'text', name: 'contact', label: 'Contact name', required: true }],
					},
					result: { contact: 'Dana Ortiz' },
				},
			],
		],
	},
]

export default function ARevisedMessage() {
	return <ChatTranscript messages={messages} />
}
