import { type ChatMessageData, ChatTranscript } from 'ui/chat'

export default function Transcript() {
	const messages: ChatMessageData[] = [
		{
			id: '1',
			sender: 'user',
			content: 'Can you help me plan the routes for Monday?',
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
		},
	]

	return <ChatTranscript messages={messages} />
}
