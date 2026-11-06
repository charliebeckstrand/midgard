import { type ChatMessageData, ChatTranscript } from 'ui/chat'
import { useIntl } from 'ui/primitives/intl'

export default function EveryState() {
	const intl = useIntl()

	const messages: ChatMessageData[] = [
		{
			id: '1',
			sender: 'assistant',
			content: [
				{
					kind: 'tool',
					id: 's1',
					label: 'Load atlas',
					status: 'done',
					summary: `${intl.formatNumber(3108)} counties`,
				},
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

	return <ChatTranscript messages={messages} />
}
