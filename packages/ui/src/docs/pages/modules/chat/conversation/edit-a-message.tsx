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
import { Icon } from 'ui/icon'
import { Stack } from 'ui/stack'
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

	const { edit, send } = chat

	const draft = useChatDraft({
		onSubmit: (value, citations) => {
			setEditing(undefined)

			void (editing ? edit(editing, value, citations) : send(value, citations))
		},
	})

	const { setValue, clear } = draft

	// A switch of branch can take the message off the shown path, and `edit`
	// then does nothing. The edit then ends and the draft clears, as Cancel does.
	if (editing !== undefined && !chat.messages.some((message) => message.id === editing)) {
		setEditing(undefined)

		clear()
	}

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

	const end = () => {
		setEditing(undefined)

		clear()
	}

	// `edit` does nothing while a reply streams, so the controls hide until it settles.
	const editable = (message: ChatMessageData) => message.sender === 'user' && !chat.streaming

	const actions = (message: ChatMessageData) =>
		editable(message) ? (
			<Button
				variant="bare"
				size="sm"
				aria-label="Edit"
				aria-pressed={message.id === editing}
				onClick={() => (message.id === editing ? end() : start(message))}
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
					editing={editing}
					actions={actions}
					contextMenu={contextMenu}
					branches={chat.branches}
					onBranchChange={chat.showBranch}
				/>
				<ChatPrompt
					ref={composer}
					value={draft.value}
					citations={draft.citations}
					onValueChange={draft.setValue}
					onSubmit={draft.submit}
					onStop={chat.stop}
					streaming={chat.streaming}
					editing={editing !== undefined}
					onCancelEdit={end}
				/>
			</Stack>
		</ChatEmbedProvider>
	)
}
