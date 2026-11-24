import { RotateCcw } from 'lucide-react'
import { useCallback } from 'react'
import {
	ChatCitationProvider,
	type ChatMessageData,
	ChatPrompt,
	ChatTranscript,
	useChatDraft,
	useChatSend,
} from 'ui/chat'
import type { ContextMenuConfig } from 'ui/context-menu'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { transport } from './reply.ts'
import { targets } from './targets.tsx'

// The draft that the composer opens with, so the reader can send it at once.
const suggestion = { text: 'How are late stops trending this week?' }

const initialMessages: ChatMessageData[] = [
	{
		id: 'welcome',
		sender: 'assistant',
		content: 'Ask about the routes, the stops, or the depots of this week.',
	},
]

export default function Conversation() {
	const chat = useChatSend({ transport, initialMessages })

	const draft = useChatDraft({
		initialValue: suggestion.text,
		onSubmit: chat.send,
	})

	const [question, last] = chat.messages.slice(-2)

	// A retry streams the reply to the last question again, so only the reply to it offers one.
	// The old reply stays as a branch, and the switcher below the bubble shows it again.
	const retryable =
		!chat.streaming && question?.sender === 'user' && last?.sender === 'assistant'
			? last.id
			: undefined

	const { retry } = chat

	// The menu of each message holds Copy by default. The last reply adds Retry.
	const contextMenu = useCallback(
		(message: ChatMessageData): ContextMenuConfig | undefined =>
			message.id === retryable
				? {
						items: [
							{ key: 'retry', label: 'Retry', icon: <RotateCcw />, onAction: () => void retry() },
						],
					}
				: undefined,
		[retryable, retry],
	)

	return (
		<ChatCitationProvider targets={targets}>
			<Stack gap="md" className="h-112">
				<ChatTranscript
					messages={chat.messages}
					streaming={chat.streaming}
					contextMenu={contextMenu}
					branches={chat.branches}
					onBranchChange={chat.showBranch}
				/>
				<ChatPrompt
					value={draft.value}
					onValueChange={draft.setValue}
					onSubmit={draft.submit}
					onStop={chat.stop}
					streaming={chat.streaming}
					toolbar={
						chat.streaming && (
							<Text tone="muted" pulse>
								Writing a reply
							</Text>
						)
					}
				/>
			</Stack>
		</ChatCitationProvider>
	)
}
