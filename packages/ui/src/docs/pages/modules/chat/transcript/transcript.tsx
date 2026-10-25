import { type ChatMessageData, ChatTranscript } from 'ui/chat'
import { useIntl } from 'ui/primitives/intl'

export default function Transcript() {
	const { formatTime } = useIntl()

	const messages: ChatMessageData[] = [
		{
			id: '1',
			sender: 'user',
			content: 'Can you help me plan the routes for Monday?',
			timestamp: formatTime(new Date(2026, 0, 5, 11, 10)),
		},
		{
			id: '2',
			sender: 'assistant',
			content: 'Yes. How many trucks do you have, and which depots do they leave from?',
		},
		{
			id: '3',
			sender: 'user',
			content: 'Six trucks, from the Dallas and Chicago depots.',
		},
		{
			id: '4',
			sender: 'assistant',
			content: 'I will split the stops between the two depots and send you a draft.',
			timestamp: formatTime(new Date(2026, 0, 5, 11, 12)),
		},
	]

	return <ChatTranscript messages={messages} />
}
