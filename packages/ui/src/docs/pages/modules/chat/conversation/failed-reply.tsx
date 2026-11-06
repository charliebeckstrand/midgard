import { RotateCcw } from 'lucide-react'
import { useCallback } from 'react'
import { Button } from 'ui/button'
import { ChatEmbedProvider, type ChatMessageData, ChatTranscript, useChatSend } from 'ui/chat'
import { Icon } from 'ui/icon'
import { renderers } from '../embeds/renderers.tsx'
import { transport } from './reply.ts'

const initialMessages: ChatMessageData[] = [
	{ id: 'question', sender: 'user', content: 'How are late stops trending this week?' },
	{
		id: 'reply',
		sender: 'assistant',
		content: [{ kind: 'tool', id: 'step', label: 'Count late stops', status: 'failed' }],
		failed: true,
	},
]

export default function FailedReply() {
	const chat = useChatSend({ transport, initialMessages })

	const { retry, streaming } = chat

	const actions = useCallback(
		(message: ChatMessageData) =>
			message.failed && !streaming ? (
				<Button variant="bare" size="sm" aria-label="Retry" onClick={() => void retry()}>
					<Icon icon={<RotateCcw />} />
				</Button>
			) : undefined,
		[retry, streaming],
	)

	return (
		<ChatEmbedProvider renderers={renderers}>
			<ChatTranscript
				messages={chat.messages}
				streaming={streaming}
				actions={actions}
				trigger="static"
				className="h-72"
			/>
		</ChatEmbedProvider>
	)
}
