import { type ChatMessageData, ChatTranscript } from 'ui/chat'

const messages: ChatMessageData[] = [
	{
		id: '1',
		sender: 'assistant',
		content: [
			{ kind: 'tool', id: 's1', name: 'Load atlas', status: 'done', summary: '3,108 counties' },
			{ kind: 'tool', id: 's2', name: 'Score routes', status: 'running' },
			{
				kind: 'tool',
				id: 's3',
				name: 'Fetch weather',
				status: 'failed',
				summary: 'the provider did not answer',
			},
		],
	},
]

export default function EveryState() {
	return <ChatTranscript messages={messages} />
}
