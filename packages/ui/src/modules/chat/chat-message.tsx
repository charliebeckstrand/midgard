import { type ComponentProps, memo, type ReactNode } from 'react'
import type { ContextMenuEntry } from '../../components/context-menu/types'
import { Markdown } from '../../components/markdown'
import { StatusDot } from '../../components/status'
import { cn } from '../../core/cn'
import { IntlMessage } from '../../primitives/intl'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { type ChatMessageVariants, k } from '../../recipes/kata/chat-message'
import { ChatEmbed } from './chat-embed'
import { ChatMessageMenu } from './chat-message-menu'
import { ChatTool, MESSAGE_HEADING_OFFSET } from './chat-tool'
import { replyFailed } from './engine/chat-announcements'
import type { ChatPart } from './engine/chat-content/types'
import type { ChatMessageData } from './engine/types'

/**
 * The visually hidden author label per sender. Bubble side and color alone
 * convey the speaker visually; this names it for assistive technology. System
 * messages are status lines, not an utterance, so they get a plain "System".
 *
 * @internal
 */
const AUTHOR = defineMessages({
	user: {
		id: 'ui.chat.user',
		defaultMessage: 'You said',
		description:
			'The hidden label before a chat message that the reader sent. A screen reader reads it before the message.',
	},
	assistant: {
		id: 'ui.chat.assistant',
		defaultMessage: 'Assistant said',
		description:
			'The hidden label before a chat message from the assistant. A screen reader reads it before the message.',
	},
	system: {
		id: 'ui.chat.system',
		defaultMessage: 'System',
		description:
			'The hidden label before a status line of a chat, which no person said. A screen reader reads it before the line.',
	},
} satisfies Record<ChatMessageData['sender'], unknown>)

/**
 * One block of a message. The switch holds every kind, so a kind added later
 * cannot reach the bubble undrawn. The compiler asks for its arm, as it does
 * for the projection and the emptiness rule.
 *
 * A text block lexes on its own rather than joined to its neighbors. Each
 * `Markdown` is then memoized on its own string, so a settled block above a
 * streaming one skips its re-lex on every chunk.
 *
 * @internal
 */
function ChatMessageBlock({ part, className }: { part: ChatPart; className?: string }) {
	switch (part.kind) {
		case 'text':
			return (
				<Markdown className={className} headingOffset={MESSAGE_HEADING_OFFSET}>
					{part.text}
				</Markdown>
			)
		case 'embed':
			return <ChatEmbed part={part} className={className} />
		case 'tool':
			return <ChatTool part={part} className={className} />
	}
}

/**
 * Props for {@link ChatMessage}. The root `<div>` takes the rest. The message
 * gives `children` and `contextMenu` types of their own.
 */
export type ChatMessageProps = ChatMessageVariants &
	Omit<ComponentProps<'div'>, 'children' | 'contextMenu'> & {
		/** Wall-clock label shown below the bubble. */
		timestamp?: ReactNode
		/** Pulses the bubble content and shows the progress cursor, while a response streams in. @defaultValue false */
		streaming?: boolean
		/**
		 * Marks a reply that failed. The bubble keeps its content and ends with a
		 * line that says that the reply failed.
		 * @defaultValue false
		 */
		failed?: boolean
		/** Controls that act on the message, such as copy, retry, and edit. `trigger` sets when they show. */
		actions?: ReactNode
		/**
		 * When `actions` show. `'hover'` is a toolbar over the top corner of the
		 * bubble that shows while the pointer is over the message or focus is in it.
		 * A device with no hover shows it as a row below the bubble. `'static'` is
		 * that row on every device.
		 * @defaultValue 'hover'
		 * @media hover
		 */
		trigger?: 'hover' | 'static'
		/**
		 * Entries of a menu that a right-click or a touch long press on the bubble
		 * opens: an item, a separator, or a submenu ({@link ContextMenuEntry}).
		 * Without entries, the bubble keeps the native menu of the browser.
		 */
		contextMenu?: ContextMenuEntry[]
		/**
		 * Message content, rendered as GitHub-flavored Markdown: prose, or the blocks
		 * it is built from.
		 */
		children: string | ChatPart[]
	}

/**
 * Conversational message bubble sided and colored by `sender`: `user`,
 * `assistant`, or `system`, defaulting to `assistant`. It takes an optional
 * `timestamp`, `actions` as a row or a hover toolbar, a `contextMenu`, and a
 * `streaming` pulse over its content.
 *
 * @remarks
 * Side and color alone convey the speaker visually, so a visually hidden author
 * label ("You said", "Assistant said", or "System") announces it to assistive
 * tech.
 *
 * Content renders as GitHub-flavored Markdown ({@link Markdown}, complete with
 * syntax-highlighted code fences). The app does not write the message, so each
 * heading in it renders one level down. A `#` heading is an `<h2>`, and the
 * message adds no `<h1>` to the page.
 *
 * {@link Markdown} sets no color of its own, so the prose inherits the
 * foreground of the bubble. It is white on the blue fill of the user bubble,
 * the default tone on the assistant bubble, and muted on the system bubble.
 * That holds in light and dark mode. While `streaming`, the bubble takes the progress cursor
 * and projects a pulse onto that prose. The bubble is steady again when the
 * stream ends. The kata holds the whole look.
 *
 * A part list draws one block per part, each keyed by the part's own id. A text
 * block is its own {@link Markdown}. An `embed` block is the renderer that
 * {@link ChatEmbedProvider} registered under its name. A `tool` block is a step
 * line that {@link ChatTool} draws. The string arm draws exactly one
 * {@link Markdown} over the string itself. A transcript of prose therefore
 * allocates nothing per render and lexes once.
 *
 * A `failed` reply ends with a line that says so, after what it landed. The
 * line inherits the foreground of the bubble, and a red dot marks it.
 *
 * The pulse rides each drawn {@link Markdown}, so a streaming reply that has
 * already landed a chart pulses its prose and leaves the chart steady.
 *
 * A `'hover'` toolbar floats above the message by most of its own height. A
 * host that clips its overflow, such as a scroll container, keeps that space
 * free above its first message. The toolbar stays in the Tab order while it is
 * hidden, so a keyboard reader reaches each action, and focus shows it. The
 * context menu of `contextMenu` is a pointer shortcut: a keyboard reader
 * opens it only from a focused control in the bubble. Give the same actions in
 * `actions` too, so that each reader reaches them.
 *
 * Memoized on its (shallow-equal) props, so a transcript's settled bubbles skip
 * re-rendering, and re-lexing their Markdown. Only the streaming bubble's
 * `children` actually changes from chunk to chunk.
 */
export const ChatMessage = memo(function ChatMessage({
	sender,
	timestamp,
	streaming,
	failed,
	actions,
	trigger,
	contextMenu,
	className,
	children,
	...props
}: ChatMessageProps) {
	const resolvedSender = sender ?? 'assistant'

	const slots = k({ sender, streaming, trigger })

	const bubble = (
		<div data-slot="chat-message-bubble" className={slots.bubble}>
			<span data-slot="chat-message-author" className="sr-only">
				<IntlMessage message={AUTHOR[resolvedSender]} />:{' '}
			</span>
			{typeof children === 'string' ? (
				<Markdown headingOffset={MESSAGE_HEADING_OFFSET}>{children}</Markdown>
			) : (
				children.map((part, index) => (
					<ChatMessageBlock
						key={part.id}
						part={part}
						className={index === 0 ? undefined : slots.part}
					/>
				))
			)}
			{failed && (
				<p
					data-slot="chat-message-failure"
					className={cn(slots.failure, children.length > 0 && slots.part)}
				>
					<StatusDot size="sm" status="error" />
					<IntlMessage message={replyFailed} />
				</p>
			)}
		</div>
	)

	return (
		<div
			data-slot="chat-message"
			{...props}
			data-sender={resolvedSender}
			className={cn(slots.base, className)}
		>
			{contextMenu === undefined ? (
				bubble
			) : (
				<ChatMessageMenu entries={contextMenu}>{bubble}</ChatMessageMenu>
			)}
			{timestamp !== undefined && (
				<div data-slot="chat-message-timestamp" className={slots.timestamp}>
					{timestamp}
				</div>
			)}
			{actions !== undefined && (
				<div data-slot="chat-message-actions" className={slots.actions}>
					{actions}
				</div>
			)}
		</div>
	)
})
