'use client'

import { Menu, Trash } from 'lucide-react'
import type { ReactNode, Ref } from 'react'
import { Button } from '../../components/button'
import { Heading } from '../../components/heading'
import { Icon } from '../../components/icon'
import { Sheet, SheetBody, SheetClose, SheetFooter, SheetTitle } from '../../components/sheet'
import { cn } from '../../core'
import { useOffcanvas } from '../../hooks'
import { ChatList } from './chat-list'
import { ChatListItem } from './chat-list-item'
import { ChatMessages } from './chat-messages'
import { ChatPrompt } from './chat-prompt'
import type { ChatContent } from './types'
import { useChatDraft } from './use-chat-draft'

/** A conversation row for the {@link ChatLayout} sidebar. */
export type ChatConversation = {
	/** Stable identity; matched against `currentConversationId` and handed to the select/remove handlers. */
	id: string
	/** Conversation title; the primary line. */
	title: ReactNode
	/** Secondary line under the title (e.g. the last message). */
	preview?: ReactNode
	/** Trailing label, typically a relative timestamp. */
	timestamp?: ReactNode
}

/** Props for {@link ChatLayout}. */
export type ChatLayoutProps = {
	/** The transcript, oldest first. */
	messages: ChatContent[]
	/** Whether a reply is streaming; toggles the prompt to its stop control and shimmers the latest bubble. */
	sending?: boolean
	/** Draft (uncommitted) mode; hides the transcript and centers the prompt. */
	isDraft?: boolean
	/** Called with the trimmed message when the user sends. */
	onSend: (message: string) => void
	/** Called when the user stops a streaming reply. */
	onStop?: () => void
	/** Called with picked files; enables the prompt's paperclip when set. */
	onAttach?: (files: File[]) => void
	/** Prompt placeholder. @defaultValue `'Ask anything'` */
	placeholder?: string
	/** Left-of-send prompt controls (model picker, slash-command trigger, …). */
	promptActions?: ReactNode
	/** Header rendered above the transcript (e.g. the conversation title). With `conversations`, a menu button to open them sits beside it below `lg`. */
	header?: ReactNode
	/** Accessible name for the prompt; forwarded to {@link ChatPrompt}. */
	'aria-label'?: string
	/** Ref to the prompt textarea (e.g. to focus it imperatively). */
	promptRef?: Ref<HTMLTextAreaElement>
	/**
	 * Conversations for the navigation sidebar. Given them, the layout builds its
	 * own {@link ChatList} of {@link ChatListItem} rows beside the transcript on
	 * desktop, collapsing below `lg` into a {@link Sheet} opened by a menu button
	 * beside the `header`. Omit (or pass empty) for a sidebarless surface.
	 */
	conversations?: ChatConversation[]
	/** The open conversation's id; marks its row current. */
	currentConversationId?: string
	/** Called with a conversation's id when its row is selected; makes rows selectable when set. */
	onConversationSelect?: (id: string) => void
	/** Called with a conversation's id when its remove control is used; adds a per-row remove button when set. */
	onConversationRemove?: (id: string) => void
	className?: string
}

/**
 * Full chat surface: a transcript above a prompt, optionally beside a
 * conversation sidebar.
 *
 * @remarks
 * Composes {@link ChatMessages} with {@link ChatPrompt}, owning the prompt draft
 * through {@link useChatDraft} so callers wire only `messages` and `onSend`. In
 * `isDraft` mode (or with no messages) the transcript is hidden and the prompt is
 * centered. Pass `conversations` and the layout builds its own navigation rail —
 * a {@link ChatList} of {@link ChatListItem} rows, each with a remove button when
 * `onConversationRemove` is set — shown inline on desktop and, below the `lg`
 * breakpoint, in a {@link Sheet} opened by a menu button beside the `header`
 * (auto-closing when the viewport grows back to desktop). The layout reflects
 * data and emits events; reach for {@link ChatListItem} / {@link ChatMessage} /
 * {@link ChatMessages} directly when you need finer control.
 */
export function ChatLayout({
	messages,
	sending,
	isDraft,
	onSend,
	onStop,
	onAttach,
	placeholder,
	promptActions,
	header,
	'aria-label': ariaLabel,
	promptRef,
	conversations,
	currentConversationId,
	onConversationSelect,
	onConversationRemove,
	className,
}: ChatLayoutProps) {
	const draft = useChatDraft({ onSubmit: onSend })

	// Drives the mobile sidebar Sheet; auto-closes when the viewport crosses back
	// to desktop. Inert (and the Sheet/menu button unrendered) without conversations.
	const { open, setOpen } = useOffcanvas()

	const showTranscript = !isDraft && messages.length > 0

	// The conversation rail, rendered identically inline (desktop) and inside the
	// mobile Sheet. Null when there are no conversations to show.
	const conversationList =
		conversations && conversations.length > 0 ? (
			<ChatList aria-label="Conversations">
				{conversations.map((conversation) => (
					<ChatListItem
						key={conversation.id}
						title={conversation.title}
						preview={conversation.preview}
						timestamp={conversation.timestamp}
						current={conversation.id === currentConversationId}
						onSelect={
							onConversationSelect ? () => onConversationSelect(conversation.id) : undefined
						}
						actions={
							onConversationRemove ? (
								<Button
									aria-label="Remove conversation"
									color="red"
									variant="plain"
									size="sm"
									onClick={() => onConversationRemove(conversation.id)}
								>
									<Icon icon={<Trash />} />
								</Button>
							) : undefined
						}
					/>
				))}
			</ChatList>
		) : null

	// With a sidebar, the header gains a menu button that opens the mobile Sheet;
	// it hides at `lg`, where the rail sits inline instead. With no header to
	// carry, the whole row is mobile-only, so it adds no desktop spacing.
	const headerRow = conversationList ? (
		<div className={cn('flex items-center gap-2', !header && 'lg:hidden')}>
			<Button
				variant="bare"
				aria-label="Open conversations"
				className="lg:hidden"
				onClick={() => setOpen(true)}
			>
				<Icon icon={<Menu />} />
			</Button>
			{header}
		</div>
	) : (
		header
	)

	const surface = (
		// gap-3 (the md step) sets the chrome gap between the transcript and the
		// prompt — the structural spacing the layout owns, not the caller.
		<div
			className={cn('flex flex-col gap-3 h-full justify-center', !conversationList && className)}
		>
			{headerRow}

			{showTranscript && <ChatMessages messages={messages} streaming={sending} />}

			<div className={cn('w-full', isDraft && 'lg:max-w-md mx-auto')}>
				<ChatPrompt
					ref={promptRef}
					value={draft.value}
					onValueChange={draft.setValue}
					onSubmit={draft.submit}
					onStop={onStop}
					streaming={sending}
					onAttach={onAttach}
					placeholder={placeholder}
					actions={promptActions}
					aria-label={ariaLabel}
				/>
			</div>
		</div>
	)

	if (!conversationList) return surface

	return (
		<div className={cn('flex h-full gap-4', className)}>
			{/* Inline rail on desktop; the menu button takes over below `lg`. */}
			<div className="flex flex-col gap-2 w-64 shrink-0 max-lg:hidden">
				<Heading level={2}>Conversations</Heading>

				<div className="flex-1 min-h-0 overflow-y-auto">{conversationList}</div>
			</div>

			{/* Same rail in an edge Sheet on mobile. Closed, the overlay is
			    unmounted, so the rail never renders twice in the a11y tree. */}
			<Sheet side="left" open={open} onOpenChange={setOpen}>
				<SheetTitle>Conversations</SheetTitle>

				<SheetBody>{conversationList}</SheetBody>

				<SheetFooter>
					<SheetClose>
						<Button variant="outline">Close</Button>
					</SheetClose>
				</SheetFooter>
			</Sheet>

			<div className="flex-1 min-w-0">{surface}</div>
		</div>
	)
}
