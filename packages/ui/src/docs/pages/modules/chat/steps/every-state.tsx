import { type ChatMessageData, ChatTranscript } from 'ui/chat'

const messages: ChatMessageData[] = [
	{
		id: '1',
		sender: 'assistant',
		content: [
			{ kind: 'tool', id: 's1', label: 'Load atlas', status: 'done', summary: '3,108 counties' },
			{ kind: 'tool', id: 's2', label: 'Score routes', status: 'running' },
			{
				kind: 'tool',
				id: 's3',
				label: 'Fetch weather',
				status: 'failed',
				summary: 'No answer from the provider',
			},
		],
	},
]

export default function EveryState() {
	return <ChatTranscript messages={messages} />
}
