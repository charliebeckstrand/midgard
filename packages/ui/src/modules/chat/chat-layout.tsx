'use client'

import { Menu } from 'lucide-react'
import type { ReactNode, Ref } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { Sheet } from '../../components/sheet'
import { cn } from '../../core'
import { useOffcanvas } from '../../hooks'
import { ChatMessages } from './chat-messages'
import { ChatPrompt } from './chat-prompt'
import type { ChatContent } from './types'
import { useChatDraft } from './use-chat-draft'

/** Props for {@link ChatLayout}. */
export type ChatLayoutProps = {
	/** The transcript, oldest first. */
	messages: ChatContent[]
	/** Whether a reply is streaming; toggles the composer to its stop control and shimmers the latest bubble. */
	sending?: boolean
	/** Draft (uncommitted) mode; hides the transcript and centers the composer. */
	isDraft?: boolean
	/** Called with the trimmed message when the user sends. */
	onSend: (message: string) => void
	/** Called when the user stops a streaming reply. */
	onStop?: () => void
	/** Called with picked files; enables the composer's paperclip when set. */
	onAttach?: (files: File[]) => void
	/** Composer placeholder. @defaultValue `'Ask anything'` */
	placeholder?: string
	/** Left-of-send composer controls (model picker, slash-command trigger, …). */
	composerActions?: ReactNode
	/**
	 * Conversation list / navigation rail. Laid out beside the chat surface on
	 * desktop; below `lg` it collapses into a {@link Sheet} opened by a menu
	 * button beside the `header`.
	 */
	sidebar?: ReactNode
	/**
	 * Header rendered above the transcript (e.g. the conversation title). When a
	 * `sidebar` is set, a menu button to open it sits beside the header below `lg`.
	 */
	header?: ReactNode
	/** Accessible name for the composer; forwarded to {@link ChatPrompt}. */
	'aria-label'?: string
	/** Ref to the composer textarea (e.g. to focus it imperatively). */
	composerRef?: Ref<HTMLTextAreaElement>
	className?: string
}

/**
 * Full chat surface: a transcript above a composer, optionally beside a sidebar.
 *
 * @remarks
 * Composes {@link ChatMessages} with {@link ChatPrompt}, owning the composer
 * draft through {@link useChatDraft} so callers wire only `messages` and
 * `onSend`. In `isDraft` mode (or with no messages) the transcript is hidden and
 * the composer is centered. Pass `sidebar` to render a conversation list (e.g.
 * {@link ChatListItem} rows) alongside the surface; below the `lg` breakpoint it
 * collapses into a {@link Sheet} opened by a menu button beside the `header`,
 * which auto-closes when the viewport grows back to desktop.
 */
export function ChatLayout({
	messages,
	sending,
	isDraft,
	onSend,
	onStop,
	onAttach,
	placeholder,
	composerActions,
	sidebar,
	header,
	'aria-label': ariaLabel,
	composerRef,
	className,
}: ChatLayoutProps) {
	const draft = useChatDraft({ onSubmit: onSend })

	// Drives the mobile sidebar Sheet; auto-closes when the viewport crosses back
	// to desktop. Inert (and the Sheet/menu button unrendered) without a sidebar.
	const { open, setOpen } = useOffcanvas()

	const showTranscript = !isDraft && messages.length > 0

	// With a sidebar, the header gains a menu button that opens the mobile Sheet;
	// it hides at `lg`, where the sidebar sits inline instead. With no header to
	// carry, the whole row is mobile-only, so it adds no desktop spacing.
	const headerRow = sidebar ? (
		<div className={cn('flex items-center gap-2', !header && 'lg:hidden')}>
			<Button
				variant="plain"
				size="sm"
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
		// composer — the structural spacing the layout owns, not the caller.
		<div className={cn('flex flex-col gap-3 h-full justify-center', !sidebar && className)}>
			{headerRow}

			{showTranscript && <ChatMessages messages={messages} streaming={sending} />}

			<div className={cn('w-full', isDraft && 'lg:max-w-md mx-auto')}>
				<ChatPrompt
					ref={composerRef}
					value={draft.value}
					onValueChange={draft.setValue}
					onSubmit={draft.submit}
					onStop={onStop}
					streaming={sending}
					onAttach={onAttach}
					placeholder={placeholder}
					actions={composerActions}
					aria-label={ariaLabel}
				/>
			</div>
		</div>
	)

	if (!sidebar) return surface

	return (
		<div className={cn('flex h-full gap-4', className)}>
			{/* Inline rail on desktop; the menu button takes over below `lg`. */}
			<div className="shrink-0 max-lg:hidden">{sidebar}</div>

			{/* Same sidebar in an edge Sheet on mobile. Closed, the overlay is
			    unmounted, so the rail never renders twice in the a11y tree. */}
			<Sheet side="left" open={open} onOpenChange={setOpen} aria-label="Conversations">
				{sidebar}
			</Sheet>

			<div className="flex-1 min-w-0">{surface}</div>
		</div>
	)
}
