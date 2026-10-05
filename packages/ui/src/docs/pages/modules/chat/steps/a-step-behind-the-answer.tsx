import { type ChatMessageData, ChatTranscript } from 'ui/chat'

const messages: ChatMessageData[] = [
	{ id: '1', sender: 'user', content: 'Which shipments are late on the north routes?' },
	{
		id: '2',
		sender: 'assistant',
		content: [
			{
				kind: 'tool',
				id: 's1',
				name: 'Filter shipments',
				status: 'done',
				summary: 'status is late AND lane is north',
				detail:
					'Matched **12** of 240 shipments.\n\n- Route 12 — 5\n- Route 30 — 4\n- Route 41 — 3',
			},
			{ kind: 'text', id: 't1', text: 'Twelve are late, and Route 12 carries most of them.' },
		],
	},
]

export default function AStepBehindTheAnswer() {
	return <ChatTranscript messages={messages} />
}
