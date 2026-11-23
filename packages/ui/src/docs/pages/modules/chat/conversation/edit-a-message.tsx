import { Pencil } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Button } from 'ui/button'
import {
	type ChatCitation,
	ChatEmbedProvider,
	type ChatMessageData,
	ChatPrompt,
	ChatTranscript,
	useChatDraft,
	useChatSend,
} from 'ui/chat'
import type { ContextMenuEntry } from 'ui/context-menu'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { renderers } from '../embeds/renderers.tsx'
import { transport } from './reply.ts'

const scope = { quote: '@Late stops by day' }

const question = { text: 'How are late stops trending this week?' }

// The question holds a citation, so an edit must bring it back to the composer.
const initialMessages: ChatMessageData[] = [
	{
		id: 'question',
		sender: 'user',
		content: [
			{
				kind: 'text',
				id: 'text',
				text: `${scope.quote} ${question.text}`,
				citations: [
					{
						id: 'scope',
						start: 0,
						end: scope.quote.length,
						quote: scope.quote,
						target: 'dataset',
						selector: { dataset: 'late-stops-by-day' },
					},
				],
			},
		],
	},
	{
		id: 'reply',
		sender: 'assistant',
		content: 'Late stops rose from **4** to **14** across the week.',
	},
]

/**
 * The text and the citations of a user message. A message that `send` or
 * `edit` made holds one text part, and its citations address that text.
 */
function readDraft(content: ChatMessageData['content']): {
	text: string
	citations: readonly ChatCitation[]
} {
	if (typeof content === 'string') return { text: content, citations: [] }

	const part = content.find((item) => item.kind === 'text')

	return part?.kind === 'text'
		? { text: part.text, citations: part.citations ?? [] }
		: { text: '', citations: [] }
}

export default function EditAMessage() {
	const chat = useChatSend({ transport, initialMessages })

	const composer = useRef<HTMLTextAreaElement>(null)

	const [editing, setEditing] = useState<string>()

	// A switch of branch can take the message off the shown path, and `edit`
	// then does nothing. The edit thus ends when its message is not shown.
	const target = chat.messages.some((message) => message.id === editing) ? editing : undefined

	const { edit, send } = chat

	const draft = useChatDraft({
		onSubmit: (value, citations) => {
			setEditing(undefined)

			void (target ? edit(target, value, citations) : send(value, citations))
		},
	})

	const { setValue, clear } = draft

	const start = useCallback(
		(message: ChatMessageData) => {
			if (!message.id) return

			const { text, citations } = readDraft(message.content)

			setEditing(message.id)

			setValue(text, citations)

			composer.current?.focus()
		},
		[setValue],
	)

	const cancel = () => {
		setEditing(undefined)

		clear()

		composer.current?.focus()
	}

	// `edit` does nothing while a reply streams, so the controls hide until it settles.
	const editable = (message: ChatMessageData) => message.sender === 'user' && !chat.streaming

	const actions = (message: ChatMessageData) =>
		editable(message) ? (
			<Button
				variant="bare"
				size="sm"
				aria-label="Edit"
				aria-pressed={message.id === target}
				onClick={() => start(message)}
			>
				<Icon icon={<Pencil />} />
			</Button>
		) : undefined

	const contextMenu = (message: ChatMessageData): ContextMenuEntry[] | undefined =>
		editable(message)
			? [{ key: 'edit', label: 'Edit', icon: <Pencil />, onAction: () => start(message) }]
			: undefined

	return (
		<ChatEmbedProvider renderers={renderers}>
			<Stack gap="md" className="h-112">
				<ChatTranscript
					messages={chat.messages}
					streaming={chat.streaming}
					actions={actions}
					contextMenu={contextMenu}
					branches={chat.branches}
					onBranchChange={chat.showBranch}
				/>
				{target && (
					<Flex align="center" justify="between" gap="sm">
						<Text tone="muted">Editing a message. Send to replace it.</Text>
						<Button variant="bare" size="sm" onClick={cancel}>
							Cancel
						</Button>
					</Flex>
				)}
				<ChatPrompt
					ref={composer}
					value={draft.value}
					citations={draft.citations}
					onValueChange={draft.setValue}
					onSubmit={draft.submit}
					onStop={chat.stop}
					streaming={chat.streaming}
				/>
			</Stack>
		</ChatEmbedProvider>
	)
}
