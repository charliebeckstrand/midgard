import { Pencil } from 'lucide-react'
import { useId, useRef, useState } from 'react'
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

	// The status in the toolbar describes the composer, so a reader who focuses it hears it.
	const status = useId()

	const { edit, send } = chat

	const draft = useChatDraft({ onSubmit: (value, citations) => void send(value, citations) })

	const { setValue } = draft

	// The draft that the reader wrote before the edit. An end of the edit with no
	// send gives it back, so an edit does not lose text that the reader typed.
	const [held, setHeld] = useState<{ value: string; citations: readonly ChatCitation[] }>()

	const end = () => {
		setEditing(undefined)

		setValue(held?.value ?? '', held?.citations ?? [])

		setHeld(undefined)
	}

	// A send of an edit gives back the held draft in place of an empty composer.
	// `edit` trims the text and moves the citations onto it, as `send` does.
	const submitEdit = () => {
		if (editing === undefined || !draft.canSubmit) return

		void edit(editing, draft.value, draft.citations)

		end()
	}

	// A switch of branch can take the message off the shown path, and `edit`
	// then does nothing. The edit then ends, as Cancel ends it.
	if (editing !== undefined && !chat.messages.some((message) => message.id === editing)) end()

	const start = (message: ChatMessageData) => {
		if (!message.id) return

		const { text, citations } = readDraft(message.content)

		// A switch to another message keeps the draft that the first edit held.
		if (editing === undefined) setHeld({ value: draft.value, citations: draft.citations })

		setEditing(message.id)

		setValue(text, citations)

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
					onSubmit={editing ? submitEdit : draft.submit}
					onStop={chat.stop}
					streaming={chat.streaming}
					onEscape={editing ? end : undefined}
					aria-describedby={editing ? status : undefined}
					toolbar={
						editing && (
							<Flex align="center" justify="between">
								<Text id={status} tone="muted">
									Editing message
								</Text>
								<Button variant="bare" size="sm" onClick={end}>
									Cancel
								</Button>
							</Flex>
						)
					}
				/>
			</Stack>
		</ChatEmbedProvider>
	)
}
