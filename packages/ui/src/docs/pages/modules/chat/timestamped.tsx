import { ChatMessage } from 'ui/chat'
import { useIntl } from 'ui/primitives/intl'

export default function Timestamped() {
	const { formatTime } = useIntl()

	return (
		<>
			<ChatMessage sender="assistant" timestamp={formatTime(new Date(2026, 0, 5, 11, 10))}>
				Heading out now. ETA 3:00 PM.
			</ChatMessage>
			<ChatMessage sender="user" timestamp={formatTime(new Date(2026, 0, 5, 11, 12))}>
				Got it. The door code is 4421.
			</ChatMessage>
		</>
	)
}
