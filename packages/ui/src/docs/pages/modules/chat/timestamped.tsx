import { ChatMessage } from 'ui/chat'

export default function Timestamped() {
	return (
		<>
			<ChatMessage sender="assistant" timestamp="11:10 AM">
				Heading out now. ETA 3:00 PM.
			</ChatMessage>
			<ChatMessage sender="user" timestamp="11:12 AM">
				Got it. The door code is 4421.
			</ChatMessage>
		</>
	)
}
