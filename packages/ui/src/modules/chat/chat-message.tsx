import { type ComponentProps, memo, type ReactNode, useId } from 'react'
import type { ContextMenuConfig } from '../../components/context-menu/types'
import { LoadingDots } from '../../components/loading'
import { Markdown } from '../../components/markdown'
import { StatusDot } from '../../components/status'
import { cn } from '../../core/cn'
import { dataAttr } from '../../core/data-attr'
import { IntlMessage } from '../../primitives/intl'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { type ChatMessageVariants, k } from '../../recipes/kata/chat-message'
import { ChatAction, ChatActionScope } from './chat-action'
import { ChatCitedText } from './chat-cited-text'
import { MESSAGE_HEADING_OFFSET } from './chat-constants'
import { ChatEmbed } from './chat-embed'
import { ChatMessageBranch } from './chat-message-branch'
import { ChatMessageMenu, ChatMessageToolbar } from './chat-message-menu'
import { ChatTool } from './chat-tool'
import { replyFailed } from './engine/chat-announcements'
import type { ChatBranch } from './engine/chat-branch/types'
import { isEmptyContent } from './engine/chat-content/normalize'
import type { ChatActionResult, ChatPart } from './engine/chat-content/types'
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

/** The labels below the bubble of a message that changed after it was sent. @internal */
const CHANGED = defineMessages({
	edited: {
		id: 'ui.chat.edited',
		defaultMessage: '(edited)',
		description:
			'The quiet label below a chat message that the reader edited. The edit sent the message in place of an earlier one.',
	},
	revised: {
		id: 'ui.chat.revised',
		defaultMessage: '(revised)',
		description:
			'The quiet label below a chat message that the assistant revised in place after it sent the message, such as after the reader answered a question in it.',
	},
})

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
		// A block with citations draws through a client leaf, which reads the
		// provider. A block with none stays a static Markdown.
		case 'text':
			return part.citations?.length ? (
				<ChatCitedText part={part} className={className} />
			) : (
				<Markdown className={className} headingOffset={MESSAGE_HEADING_OFFSET}>
					{part.text}
				</Markdown>
			)
		case 'embed':
			return <ChatEmbed part={part} className={className} />
		case 'tool':
			return <ChatTool part={part} className={className} />
		case 'action':
			return <ChatAction part={part} className={className} />
	}
}

/**
 * Whether the menu of a message has an item. It has one unless the caller
 * removes the menu, or removes the defaults and adds no item. A menu with no
 * item does not open, so the bubble keeps the native menu, and the message
 * shows no toolbar.
 *
 * @internal
 */
function hasMenuItems(contextMenu: ContextMenuConfig | false | undefined): boolean {
	if (contextMenu === false) return false

	return contextMenu?.defaultItems !== false || (contextMenu.items?.length ?? 0) > 0
}

/**
 * The row below the bubble: the "(edited)" or "(revised)" label at its start,
 * and the branch switcher of a message with more than one branch. A message
 * with neither has no row.
 *
 * @internal
 */
function ChatMessageFooter({
	edited,
	revised,
	branch,
	onBranchChange,
	className,
	labelClassName,
}: Pick<ChatMessageProps, 'edited' | 'revised' | 'branch' | 'onBranchChange'> & {
	className: string
	labelClassName: string
}) {
	const branched = branch !== undefined && branch.ids.length > 1

	// A reader's edit makes a new message, and a revision changes one in place,
	// so a message takes one of the two labels, and an edit wins.
	const changed = (edited && CHANGED.edited) || (revised && CHANGED.revised)

	if (!changed && !branched) return null

	return (
		<div data-slot="chat-message-footer" className={className}>
			{changed && (
				<span data-slot="chat-message-edited" className={labelClassName}>
					<IntlMessage message={changed} />
				</span>
			)}
			{branched && <ChatMessageBranch branch={branch} onBranchChange={onBranchChange} />}
		</div>
	)
}

/**
 * Props for {@link ChatMessage}. The root `<div>` takes the rest. The message
 * gives `children` and `contextMenu` types of their own.
 */
export type ChatMessageProps = ChatMessageVariants &
	Omit<ComponentProps<'div'>, 'children' | 'contextMenu'> & {
		/** Wall-clock label shown below the bubble. */
		timestamp?: ReactNode
		/**
		 * Pulses the bubble content and shows the progress cursor, while a response
		 * streams in. A streaming bubble with no content yet shows loading dots.
		 * @defaultValue false
		 */
		streaming?: boolean
		/**
		 * Marks a message that the composer edits. A ring marks the bubble until
		 * the edit ends, so the reader sees which message a send replaces. The
		 * message root takes `data-editing`.
		 * @defaultValue false
		 */
		editing?: boolean
		/**
		 * Marks a message that an edit sent in place of an earlier message. A quiet
		 * "(edited)" label shows below the bubble, at its start. The `edit` of
		 * `useChatSend` marks the message, and {@link ChatTranscript} passes the
		 * mark on.
		 * @defaultValue false
		 */
		edited?: boolean
		/**
		 * Marks a message that its sender revised in place, such as after the
		 * reader answered an ask in it. A quiet "(revised)" label shows below the
		 * bubble, at its start. A {@link ChatRevision} that the transport of
		 * `useChatSend` yields marks the message, and {@link ChatTranscript} passes
		 * the mark on.
		 * @defaultValue false
		 */
		revised?: boolean
		/**
		 * Answers an `action` block of the message: it fires with the id of the
		 * block and the result that the reader submitted, as the `submitAction` of
		 * `useChatSend` takes them after the id of the message. Without it, each
		 * action of the message draws read-only. {@link ChatTranscript} binds it
		 * to the id of each message.
		 */
		onActionSubmit?: (partId: string, result: ChatActionResult) => void
		/**
		 * Marks a reply that failed. The bubble keeps its content and ends with a
		 * line that says that the reply failed.
		 * @defaultValue false
		 */
		failed?: boolean
		/**
		 * The menu of the message, which holds each action of the message. On a
		 * device that hovers, the toolbar over the corner of the bubble shows the
		 * first three as icon buttons, and an ellipsis button opens the rest. On a
		 * device with no hover, a long press on the bubble opens the menu, and the
		 * bubble is a tab stop that a keyboard opens the menu from. Its
		 * default item is Copy, with the key `'copy'`, which copies the text of
		 * the message. `items` adds the actions of the app, such as
		 * Edit and Retry, after a separator ({@link ContextMenuConfig}). `false`
		 * removes the menu and its button, and the bubble keeps the native menu
		 * of the browser.
		 */
		contextMenu?: ContextMenuConfig | false
		/**
		 * How the menu opens on a device that hovers. `'hover'` shows the actions
		 * in a toolbar while the pointer is over the bubble, and a
		 * right-click keeps the native menu of the browser. `'contextmenu'` opens
		 * the menu on a right-click on the bubble, and the message shows no
		 * toolbar. The bubble is then a tab stop, so a keyboard opens the menu with
		 * the ContextMenu key or Shift+F10. On a device with no hover, a long press
		 * opens the menu for each value.
		 * @defaultValue 'hover'
		 */
		trigger?: 'hover' | 'contextmenu'
		/**
		 * The branches at the place of the message. A retry and an edit each add
		 * one. With more than one, a switcher below the bubble shows the position,
		 * such as `2 of 3`, between a previous and a next button.
		 */
		branch?: ChatBranch
		/**
		 * Fires with the id of the branch that the reader picks in the switcher.
		 * Without it, the switcher shows its position and its buttons are off.
		 */
		onBranchChange?: (id: string) => void
		/**
		 * Message content, rendered as GitHub-flavored Markdown: prose, or the blocks
		 * it is built from.
		 */
		children: string | ChatPart[]
	}

/**
 * Conversational message bubble sided and colored by `sender`: `user`,
 * `assistant`, or `system`, defaulting to `assistant`. It takes an optional
 * `timestamp`, a `contextMenu` with Copy by default, and a `streaming` pulse
 * over its content.
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
 * That holds in light and dark mode. While `streaming`, the bubble takes the
 * progress cursor and projects a pulse onto that prose. The bubble is steady
 * again when the stream ends. The kata holds the whole look.
 *
 * A `streaming` reply that has no content yet shows {@link LoadingDots} in its
 * bubble, and not an empty bubble. The first text or part replaces the dots. A
 * `failed` reply shows its failure line and no dots. The dots are hidden from
 * assistive technology, because {@link ChatTranscript} announces the wait.
 *
 * A part list draws one block per part, each keyed by the part's own id. A text
 * block is its own {@link Markdown}. An `embed` block is the renderer that
 * {@link ChatEmbedProvider} registered under its name. A `tool` block is a step
 * line that {@link ChatTool} draws. An `action` block is an ask of the
 * assistant that `onActionSubmit` answers: a choice of radios, or a button
 * that opens a form in a panel. The string arm draws exactly one
 * {@link Markdown} over the string itself. A transcript of prose therefore
 * allocates nothing per render and lexes once.
 *
 * An `editing` bubble takes a ring: a 2px outline with a 2px gap. The text
 * of the bubble keeps its full contrast. A dim would lower the white text of
 * the blue user bubble below 4.5:1. The root takes `data-editing`, so an app
 * can find the message. The ring is visual only. The app tells a screen reader
 * about the edit, such as with a status that `aria-describedby` of the
 * composer points to.
 *
 * For a reader who reduces motion, a streaming reply dims to 60% of its
 * opacity in place of the pulse. On the assistant fill, the text keeps 4.5:1.
 *
 * A `failed` reply ends with a line that says so, after what it landed. The
 * line inherits the foreground of the bubble, and a red dot marks it.
 *
 * An `edited` message shows a quiet "(edited)" label below its bubble, at the
 * start of the bubble. The label and the branch switcher share one row, which
 * is as wide as the bubble, and the switcher stays on the side of the speaker.
 * The label follows the bubble, so a screen reader reads it after the message.
 *
 * A `revised` message shows a quiet "(revised)" label in the same place. An
 * edit by the reader makes a new message, and a revision by the agent changes
 * the message in place, so the two labels differ.
 *
 * A message with more than one `branch` shows a switcher below its bubble. The
 * switcher is a group named "Versions", in the language of the reader. Each
 * button names the branch that it shows, and the text between them gives the
 * position. The message holds no branch itself: `onBranchChange` gives the id
 * that the reader picked, and the caller shows that branch.
 *
 * The pulse rides each drawn {@link Markdown}, so a streaming reply that has
 * already landed a chart pulses its prose and leaves the chart steady.
 *
 * The menu holds each action of the message, and the message shows no row of
 * icons below its bubble. On a device that hovers, a toolbar over the bubble
 * shows the actions, and a right-click keeps the native menu of the browser.
 * With `trigger` `'contextmenu'`, a right-click on the bubble opens the menu
 * there in place of the toolbar. On a device with no hover, a touch long press
 * on the bubble opens it as a context menu, for each `trigger`. The Copy item
 * copies the plain text of the message ({@link chatContentText}), and it is off
 * while the message has no text.
 *
 * The toolbar sits over the outer top corner of the bubble, on the side of the
 * speaker. A `system` line takes its start corner. It shows the first
 * three items of the menu as icon buttons, each with a tooltip, and a press
 * runs the action at once. An ellipsis button, "More actions", opens a dropdown
 * with the other entries. A menu of three items or fewer, each with an icon,
 * such as Copy, Edit, and Retry, has no ellipsis. The icon buttons stop at the
 * first submenu or item with no icon, so the order of the menu holds. The
 * toolbar is one Tab stop, and the arrow keys move between its buttons.
 * The toolbar shows while the pointer is over the bubble or the toolbar, while
 * a keyboard focus is in the message, or while its menu is open. A press also
 * focuses a control, but that focus does not show the toolbar. On a device
 * that hovers, the toolbar stays in the Tab order while it is hidden, so a
 * keyboard reader reaches the menu. A message with a menu keeps 24px of room
 * above its bubble for the toolbar. The toolbar thus stays in the box of the
 * message, and a host that clips its overflow does not cut it. A device with
 * no hover has no toolbar and keeps no room: a long press on the bubble opens
 * the menu there. The bubble is then a tab stop, so a keyboard opens the menu
 * with the ContextMenu key or Shift+F10, as with `trigger` `'contextmenu'`.
 *
 * After a copy, the focus goes to the bubble, and not back to the button in the
 * toolbar. The next Tab thus goes into the controls of the message again. The
 * bubble shows a focus ring only for a keyboard focus, so a copy with the
 * pointer moves the focus silently. Tab does not stop on the bubble where the
 * toolbar holds the menu.
 *
 * Memoized on its (shallow-equal) props, so a transcript's settled bubbles skip
 * re-rendering, and re-lexing their Markdown. Only the streaming bubble's
 * `children` actually changes from chunk to chunk.
 */
export const ChatMessage = memo(function ChatMessage({
	sender,
	timestamp,
	streaming,
	editing,
	edited,
	revised,
	onActionSubmit,
	failed,
	contextMenu,
	trigger = 'hover',
	branch,
	onBranchChange,
	className,
	children,
	...props
}: ChatMessageProps) {
	const resolvedSender = sender ?? 'assistant'

	const menu = contextMenu === false ? undefined : contextMenu

	const hasMenu = hasMenuItems(contextMenu)

	// The toolbar holds the actions on a device that hovers, unless a
	// right-click opens the menu there.
	const toolbar = hasMenu && trigger === 'hover'

	const rightClick = hasMenu && trigger === 'contextmenu'

	const slots = k({ sender, streaming, editing, menu: toolbar })

	// The id of the bubble. The Copy item moves the focus to the bubble.
	const bubbleId = useId()

	// A reply with nothing in it yet shows the dots, and not an empty bubble. The
	// dots are an `<output>`, a live region. The transcript announces the wait
	// on its one channel, so the dots stay out of the accessibility tree.
	const pending = streaming === true && !failed && isEmptyContent(children)

	// The scope wraps the content on each render, so an answer that turns on or
	// off keeps the state of each ask in the message.
	const content = (
		<ChatActionScope onSubmit={onActionSubmit}>
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
		</ChatActionScope>
	)

	const bubble = (
		// Tab does not stop on the bubble, but the Copy item of the menu moves the
		// focus to it. Where the menu opens over the bubble, the menu makes the
		// bubble a tab stop, so a keyboard opens the menu from it.
		<div id={bubbleId} tabIndex={-1} data-slot="chat-message-bubble" className={slots.bubble}>
			<span data-slot="chat-message-author" className="sr-only">
				<IntlMessage message={AUTHOR[resolvedSender]} />:{' '}
			</span>
			{pending ? <LoadingDots aria-hidden="true" /> : content}
			{failed && (
				<p
					data-slot="chat-message-failure"
					className={cn(slots.failure, !isEmptyContent(children) && slots.part)}
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
			data-editing={dataAttr(editing)}
			className={cn(slots.base, className)}
		>
			<div data-slot="chat-message-frame" className={slots.frame}>
				{contextMenu === false ? (
					bubble
				) : (
					<ChatMessageMenu
						config={menu}
						content={children}
						bubble={bubbleId}
						rightClick={rightClick}
					>
						{bubble}
					</ChatMessageMenu>
				)}
				<ChatMessageFooter
					edited={edited}
					revised={revised}
					branch={branch}
					onBranchChange={onBranchChange}
					className={slots.footer}
					labelClassName={slots.edited}
				/>
				{toolbar && (
					<div data-slot="chat-message-toolbar" className={slots.toolbar}>
						<ChatMessageToolbar
							config={menu}
							content={children}
							bubble={bubbleId}
							sender={resolvedSender}
						/>
					</div>
				)}
			</div>
			{timestamp !== undefined && (
				<div data-slot="chat-message-timestamp" className={slots.timestamp}>
					{timestamp}
				</div>
			)}
		</div>
	)
})
