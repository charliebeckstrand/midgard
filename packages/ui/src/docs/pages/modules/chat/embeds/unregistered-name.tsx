import { ChatEmbedProvider, type ChatMessageData, ChatTranscript } from 'ui/chat'
import { renderers } from './renderers.tsx'

const messages: ChatMessageData[] = [
	{
		id: '1',
		sender: 'assistant',
		content: [
			{ kind: 'text', id: 't1', text: 'Here are those twelve stops on the map.' },
			{ kind: 'embed', id: 'e1', name: 'stops-map', data: null },
		],
	},
]

export default function UnregisteredName() {
	return (
		<ChatEmbedProvider renderers={renderers}>
			<ChatTranscript messages={messages} />
		</ChatEmbedProvider>
	)
}
