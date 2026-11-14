import { ChatMessage } from 'ui/chat'
import { DateTime } from 'ui/date-time'

// The time of a message, as `formatTime` writes it.
const TIME = { hour: 'numeric', minute: 'numeric' } as const

export default function Timestamped() {
	return (
		<>
			<ChatMessage
				sender="assistant"
				timestamp={<DateTime value={new Date(2026, 0, 5, 11, 10)} format={TIME} />}
			>
				Heading out now. ETA 3:00 PM.
			</ChatMessage>
			<ChatMessage
				sender="user"
				timestamp={<DateTime value={new Date(2026, 0, 5, 11, 12)} format={TIME} />}
			>
				Got it. The door code is 4421.
			</ChatMessage>
		</>
	)
}
