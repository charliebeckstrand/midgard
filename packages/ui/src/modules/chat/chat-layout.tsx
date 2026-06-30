'use client'

import type { ReactNode, Ref } from 'react'
import { cn } from '../../core'
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
	/** Conversation list / navigation rail, laid out beside the chat surface. */
	sidebar?: ReactNode
	/** Header rendered above the transcript (e.g. the conversation title). */
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
 * {@link ChatListItem} rows) alongside the surface.
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

	const showTranscript = !isDraft && messages.length > 0

	const surface = (
		// gap-3 (the md step) sets the chrome gap between the transcript and the
		// composer — the structural spacing the layout owns, not the caller.
		<div className={cn('flex flex-col gap-3 h-full justify-center', !sidebar && className)}>
			{header}

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
			{sidebar}
			<div className="flex-1 min-w-0">{surface}</div>
		</div>
	)
}
