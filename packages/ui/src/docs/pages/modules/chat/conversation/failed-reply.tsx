import { RotateCcw } from 'lucide-react'
import { useCallback } from 'react'
import { ChatEmbedProvider, type ChatMessageData, ChatTranscript, useChatSend } from 'ui/chat'
import type { ContextMenuConfig } from 'ui/context-menu'
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

	// The menu of each message holds Copy by default. The failed reply adds Retry.
	const contextMenu = useCallback(
		(message: ChatMessageData): ContextMenuConfig | undefined =>
			message.failed && !streaming
				? {
						items: [
							{ key: 'retry', label: 'Retry', icon: <RotateCcw />, onAction: () => void retry() },
						],
					}
				: undefined,
		[retry, streaming],
	)

	return (
		<ChatEmbedProvider renderers={renderers}>
			<ChatTranscript
				messages={chat.messages}
				streaming={streaming}
				contextMenu={contextMenu}
				className="h-72"
			/>
		</ChatEmbedProvider>
	)
}
