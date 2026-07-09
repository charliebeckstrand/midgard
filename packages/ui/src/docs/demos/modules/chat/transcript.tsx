import { type ChatContent, ChatTranscript } from '../../../../modules/chat'
import { Example } from '../../../engine'

const transcript: ChatContent[] = [
	{
		id: '1',
		role: 'user',
		content: 'Can you help me plan the project kickoff meeting?',
		timestamp: '11:10 AM',
	},
	{
		id: '2',
		role: 'agent',
		content: "Of course! Who's attending, and what outcome do you need from it?",
	},
	{
		id: '3',
		role: 'user',
		content: 'Engineering, product, and design — to align on the Q2 roadmap.',
	},
	{
		id: '4',
		role: 'agent',
		content: 'Looking forward to it!',
		timestamp: '11:12 AM',
	},
]

export function Demo() {
	return (
		<Example title="Transcript">
			<ChatTranscript messages={transcript} />
		</Example>
	)
}
