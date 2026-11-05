import { RotateCcw } from 'lucide-react'
import { useCallback } from 'react'
import { Button } from 'ui/button'
import {
	ChatEmbedProvider,
	type ChatMessageData,
	ChatPrompt,
	ChatTranscript,
	useChatDraft,
	useChatSend,
} from 'ui/chat'
import { CopyButton } from 'ui/copy-button'
import { Icon } from 'ui/icon'
import { Stack } from 'ui/stack'
import { renderers } from '../embeds/renderers.tsx'
import { messageText, transport } from './reply.ts'

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
	const retryable =
		!chat.streaming && question?.sender === 'user' && last?.sender === 'assistant'
			? last.id
			: undefined

	const { retry } = chat

	const actions = useCallback(
		(message: ChatMessageData) => (
			<>
				<CopyButton size="sm" text={() => messageText(message)} />
				{message.id === retryable && (
					<Button variant="bare" size="sm" aria-label="Retry" onClick={() => void retry()}>
						<Icon icon={<RotateCcw />} />
					</Button>
				)}
			</>
		),
		[retryable, retry],
	)

	return (
		<ChatEmbedProvider renderers={renderers}>
			<Stack gap="md" className="h-112">
				<ChatTranscript messages={chat.messages} streaming={chat.streaming} actions={actions} />
				<ChatPrompt
					value={draft.value}
					onValueChange={draft.setValue}
					onSubmit={draft.submit}
					onStop={chat.stop}
					streaming={chat.streaming}
				/>
			</Stack>
		</ChatEmbedProvider>
	)
}
