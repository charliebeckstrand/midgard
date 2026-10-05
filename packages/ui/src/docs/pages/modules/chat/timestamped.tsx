import { ChatMessage } from 'ui/chat'

export default function Timestamped() {
	return (
		<>
			<ChatMessage role="assistant" timestamp="11:10 AM">
				Heading out now, ETA 3pm.
			</ChatMessage>
			<ChatMessage role="user" timestamp="11:12 AM">
				Got it — door code is 4421.
			</ChatMessage>
		</>
	)
}
