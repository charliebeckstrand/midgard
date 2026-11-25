import { Pencil } from 'lucide-react'
import { useRef, useState } from 'react'
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
import { Drawer, DrawerBody, DrawerHeader, DrawerPanel, DrawerTitle } from 'ui/drawer'
import { Stack } from 'ui/stack'
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

	const { edit, send } = chat

	// The composer below the transcript. An edit never changes its draft.
	const draft = useChatDraft({ onSubmit: (value, citations) => void send(value, citations) })

	const composer = useRef<HTMLTextAreaElement>(null)

	// The message in the edit, with its text and its citations as the edit started.
	const [editing, setEditing] = useState<{ id: string; from: Draft }>()

	// Where the focus goes when the drawer closes. A send of the edit replaces
	// the message and its menu, so the focus then goes to the composer. Each
	// other close gives the focus back to the menu that opened the drawer.
	const returnTo = useRef<HTMLElement | null>(null)

	// The composer of the drawer, with its own draft.
	const revision = useChatDraft({
		onSubmit: (value, citations) => {
			if (editing === undefined) return

			void edit(editing.id, value, citations)

			returnTo.current = composer.current

			setEditing(undefined)
		},
	})

	const field = useRef<HTMLTextAreaElement>(null)

	const confirm = useConfirm()

	const changed =
		editing !== undefined &&
		!sameDraft(editing.from, { text: revision.value, citations: revision.citations })

	// Each close of the drawer that drops a changed draft asks first: Escape,
	// the backdrop, and the close button. "Keep editing" gives the focus back
	// to the field of the drawer.
	const close = async () => {
		if (
			changed &&
			!(await confirm({
				title: 'Discard your changes?',
				confirm: { label: 'Discard', color: 'red' },
				cancel: { label: 'Keep editing' },
				returnFocusTo: field,
			}))
		) {
			return
		}

		setEditing(undefined)
	}

	const start = (message: ChatMessageData) => {
		if (!message.id) return

		const from = readDraft(message.content)

		revision.setValue(from.text, from.citations)

		returnTo.current = null

		setEditing({ id: message.id, from })
	}

	// `edit` does nothing while a reply streams, so the menu offers no Edit until it settles.
	const editable = (message: ChatMessageData) => message.sender === 'user' && !chat.streaming

	// The menu of each message holds Copy by default, and a user message adds Edit.
	const contextMenu = (message: ChatMessageData): ContextMenuConfig | undefined =>
		editable(message)
			? {
					items: [{ key: 'edit', label: 'Edit', icon: <Pencil />, onAction: () => start(message) }],
				}
			: undefined

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
					ref={composer}
					value={draft.value}
					citations={draft.citations}
					onValueChange={draft.setValue}
					onSubmit={draft.submit}
					onStop={chat.stop}
					streaming={chat.streaming}
				/>
			</Stack>
			<Drawer
				open={editing !== undefined}
				onOpenChange={(open) => {
					if (!open) void close()
				}}
			>
				<DrawerPanel initialFocus={field} returnFocusTo={returnTo} footer={null}>
					<DrawerHeader closable>
						<DrawerTitle>Edit message</DrawerTitle>
					</DrawerHeader>
					<DrawerBody>
						<ChatPrompt
							ref={field}
							value={revision.value}
							citations={revision.citations}
							onValueChange={revision.setValue}
							onSubmit={revision.submit}
						/>
					</DrawerBody>
				</DrawerPanel>
			</Drawer>
		</ChatCitationProvider>
	)
}
