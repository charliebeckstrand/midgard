import { type ChatMessageData, ChatTranscript } from 'ui/chat'

const messages: ChatMessageData[] = [
	{
		id: '1',
		sender: 'user',
		content: 'Can you help me plan the project kickoff meeting?',
		timestamp: '11:10 AM',
	},
	{
		id: '2',
		sender: 'assistant',
		content: "Of course! Who's attending, and what outcome do you need from it?",
	},
	{
		id: '3',
		sender: 'user',
		content: 'Engineering, product, and design — to align on the Q2 roadmap.',
	},
	{
		id: '4',
		sender: 'assistant',
		content: 'Looking forward to it!',
		timestamp: '11:12 AM',
	},
]

export default function Transcript() {
	return <ChatTranscript messages={messages} />
}
