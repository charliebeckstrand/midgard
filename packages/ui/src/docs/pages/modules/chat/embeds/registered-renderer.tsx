import { ChatEmbedProvider, type ChatMessageData, ChatTranscript } from 'ui/chat'
import { renderers } from './renderers.tsx'

const messages: ChatMessageData[] = [
	{ id: '1', role: 'user', content: 'How are late stops trending this week?' },
	{
		id: '2',
		role: 'assistant',
		content: [
			{ kind: 'text', id: 't1', text: 'Late stops rose from **4** to **14** across the week.' },
			{ kind: 'embed', id: 'e1', name: 'stops-trend', data: [4, 6, 5, 9, 12, 11, 14] },
			{ kind: 'text', id: 't2', text: 'Most of the rise sits on the north routes.' },
		],
	},
]

export default function RegisteredRenderer() {
	return (
		<ChatEmbedProvider renderers={renderers}>
			<ChatTranscript messages={messages} />
		</ChatEmbedProvider>
	)
}
