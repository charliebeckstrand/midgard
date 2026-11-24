import { Pencil, X } from 'lucide-react'
import { useId, useLayoutEffect, useRef, useState } from 'react'
import { Button } from 'ui/button'
import {
	type ChatCitation,
	ChatCitationProvider,
	type ChatMessageData,
	ChatPrompt,
	ChatTranscript,
	useChatDraft,
	useChatSend,
} from 'ui/chat'
import { useConfirm } from 'ui/confirm'
import type { ContextMenuConfig } from 'ui/context-menu'
import { Flex } from 'ui/flex'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { transport } from './reply.ts'
import { targets } from './targets.tsx'

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

type Draft = ReturnType<typeof readDraft>

/** Tells whether the composer still holds the text and the citations of the message. */
function sameDraft(a: Draft, b: Draft): boolean {
	return (
		a.text === b.text &&
		a.citations.length === b.citations.length &&
		a.citations.every(
			(citation, index) =>
				citation.id === b.citations[index]?.id &&
				citation.start === b.citations[index]?.start &&
				citation.end === b.citations[index]?.end,
		)
	)
}

export default function EditAMessage() {
	const chat = useChatSend({ transport, initialMessages })

	const composer = useRef<HTMLTextAreaElement>(null)

	// The message in the edit, with its text and its citations as the edit started.
	const [editing, setEditing] = useState<{ id: string; from: Draft }>()

	const confirm = useConfirm()

	// The status in the toolbar describes the composer, so a reader who focuses it hears it.
	const status = useId()

	const { edit, send } = chat

	const draft = useChatDraft({ onSubmit: (value, citations) => void send(value, citations) })

	const { setValue } = draft

	// The draft that the reader wrote before the edit. Each end of the edit (a
	// cancel, a send, or a switch of branch) gives it back, so an edit does not
	// lose text that the reader typed.
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

		void edit(editing.id, draft.value, draft.citations)

		end()
	}

	// A switch of branch can take the message off the shown path, and `edit`
	// then does nothing. The edit then ends, as Cancel ends it.
	if (editing !== undefined && !chat.messages.some((message) => message.id === editing.id)) end()

	const changed =
		editing !== undefined &&
		!sameDraft(editing.from, { text: draft.value, citations: draft.citations })

	// Each end of an edit that drops a changed draft asks first: a cancel, a
	// switch to another message, and a switch of branch that takes the message away. The focus goes back to the composer, also when
	// the question came from the menu of a message.
	const discard = async () =>
		!changed ||
		confirm({
			title: 'Discard your changes?',
			confirm: { label: 'Discard', color: 'red' },
			cancel: { label: 'Keep editing' },
			returnFocusTo: composer,
		})

	const start = async (message: ChatMessageData) => {
		if (!message.id || !(await discard())) return

		const from = readDraft(message.content)

		// A switch to another message keeps the draft that the first edit held.
		if (editing === undefined) setHeld({ value: draft.value, citations: draft.citations })

		setEditing({ id: message.id, from })

		setValue(from.text, from.citations)
	}

	// The focus moves after the commit, so the composer already holds the text
	// of the message and the edit status, and a screen reader reads both.
	useLayoutEffect(() => {
		if (editing !== undefined) composer.current?.focus()
	}, [editing])

	// A switch of branch at the message in the edit, or above it, takes the
	// message off the shown path.
	const showBranch = async (id: string) => {
		const at = chat.messages.findIndex(
			(message) => message.id !== undefined && chat.branches[message.id]?.ids.includes(id),
		)

		const edited = chat.messages.findIndex((message) => message.id === editing?.id)

		if (at <= edited && !(await discard())) return

		chat.showBranch(id)
	}

	// A click does not focus a button in Safari, so the toolbar row cannot find
	// the focus in it as it unmounts. Cancel gives the focus back to the composer.
	const cancel = async () => {
		if (!(await discard())) return

		end()

		composer.current?.focus()
	}

	// `edit` does nothing while a reply streams, so the controls hide until it settles.
	const editable = (message: ChatMessageData) => message.sender === 'user' && !chat.streaming

	// The menu of each message holds Copy by default. A user message adds Edit,
	// and the message in the edit shows Cancel in its place.
	const contextMenu = (message: ChatMessageData): ContextMenuConfig | undefined => {
		if (!editable(message)) return undefined

		return {
			items: [
				message.id === editing?.id
					? { key: 'cancel', label: 'Cancel', icon: <X />, onAction: () => void cancel() }
					: { key: 'edit', label: 'Edit', icon: <Pencil />, onAction: () => void start(message) },
			],
		}
	}

	return (
		<ChatCitationProvider targets={targets}>
			<Stack gap="md" className="h-112">
				<ChatTranscript
					messages={chat.messages}
					streaming={chat.streaming}
					editing={editing?.id}
					contextMenu={contextMenu}
					branches={chat.branches}
					onBranchChange={(id) => void showBranch(id)}
				/>
				<ChatPrompt
					ref={composer}
					value={draft.value}
					citations={draft.citations}
					onValueChange={draft.setValue}
					onSubmit={editing ? submitEdit : draft.submit}
					onStop={chat.stop}
					streaming={chat.streaming}
					onEscape={editing ? () => void cancel() : undefined}
					aria-describedby={editing ? status : undefined}
					toolbar={
						editing && (
							<Flex align="center" justify="between">
								<Text id={status} tone="muted">
									Editing message
								</Text>
								<Button variant="bare" size="sm" onClick={() => void cancel()}>
									Cancel
								</Button>
							</Flex>
						)
					}
				/>
			</Stack>
		</ChatCitationProvider>
	)
}
