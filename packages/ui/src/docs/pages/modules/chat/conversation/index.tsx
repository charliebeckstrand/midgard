import { Example } from '../../../../kit/index.ts'
import Conversation from './conversation.tsx'
import FailedReply from './failed-reply.tsx'

export default function ConversationTab() {
	return (
		<>
			<Example of={Conversation} surface />
			<Example of={FailedReply} surface />
		</>
	)
}
