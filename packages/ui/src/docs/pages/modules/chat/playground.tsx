import { ChatMessage, type ChatMessageProps } from 'ui/chat'

export default function ChatPlayground(props: ChatMessageProps) {
	return <ChatMessage {...props}>Heading out now. ETA 3:00 PM.</ChatMessage>
}
