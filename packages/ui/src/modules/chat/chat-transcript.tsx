'use client'

import { ArrowDown } from 'lucide-react'
import { useComposedRefs } from 'motion/react'
import {
	type ComponentProps,
	memo,
	type UIEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { Button } from '../../components/button'
import type { ContextMenuConfig } from '../../components/context-menu/types'
import { Icon } from '../../components/icon'
import { cn } from '../../core/cn'
import { composeEventHandlers } from '../../core/compose-event-handlers'
import { useA11yAnnouncements } from '../../hooks/a11y/use-a11y-announcements'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { useScrollRegion } from '../../hooks/use-scroll-region'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useVirtualWindow } from '../../hooks/use-virtual-window'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/chat-transcript'
import { ChatMessage } from './chat-message'
import { ChatRowContext } from './context'
import { describeTranscript } from './engine/chat-announcements'
import type { ChatBranch } from './engine/chat-branch/types'
import type { ChatActionResult } from './engine/chat-content/types'
import type { ChatMessageData } from './engine/types'
import { useChatTranscriptItemKey } from './use-chat-transcript-item-key'
import { useChatTranscriptStatus } from './use-chat-transcript-status'

const labels = defineMessages({
	conversation: {
		id: 'ui.chat.conversation',
		defaultMessage: 'Conversation',
		description:
			'The name of the scrolling list of the messages of a chat. A screen reader reads it when the focus goes to the list.',
	},
	newest: {
		id: 'ui.chat.newest',
		defaultMessage: 'Go to the newest message',
		description:
			'The name of the button that scrolls a chat back down to its newest message. It shows when the reader has scrolled up.',
	},
})

/**
 * The first guess at a row's height, in pixels: one short bubble, its
 * timestamp, and the gap above it. Each row measures its real height when it
 * renders, so this only places the rows that have not rendered yet.
 *
 * @internal
 */
const ESTIMATED_ROW_HEIGHT = 96

/** Rows the window renders outside the viewport on each side. @internal */
const OVERSCAN = 4

/**
 * Rows drawn while the window holds none: the newest this many messages.
 *
 * @remarks
 * The window is empty until the scroll container has measured. That is one
 * commit in a browser, and every commit where nothing lays out: a server
 * render, jsdom, or a `display: none` ancestor. The safe answer when the
 * environment cannot tell is to draw, so these rows stand in.
 *
 * @internal
 */
const UNMEASURED_ROWS = 20

/**
 * How near the end, in pixels, the transcript counts as at its end. It is the
 * default `scrollEndThreshold` of virtual-core, so the pin and the end anchor of
 * the window agree. @internal
 */
const END_THRESHOLD = 1

/** Whether the scroll of `element` is at its end. @internal */
function isAtEnd(element: HTMLElement): boolean {
	return element.scrollHeight - element.clientHeight - element.scrollTop <= END_THRESHOLD
}

/**
 * Props for {@link ChatTranscript}. The scroll `<div>` takes the rest. The
 * transcript writes its rows itself, so it takes no `children`.
 */
export type ChatTranscriptProps = Omit<ComponentProps<'div'>, 'children' | 'contextMenu'> & {
	/**
	 * The transcript, oldest first. Give each message an `id`: the window keys
	 * each row and each measured height by it. A message with no id falls back
	 * to its index, which goes stale when messages are inserted above it.
	 */
	messages: ChatMessageData[]
	/**
	 * Marks the last message as a streaming reply when it is an assistant bubble.
	 * @defaultValue false
	 */
	streaming?: boolean
	/**
	 * The id of the message that the composer edits. A ring marks that message,
	 * as the `editing` of {@link ChatMessage} tells.
	 */
	editing?: string
	/**
	 * The menu of one message, with Copy by default, as the `contextMenu` of
	 * {@link ChatMessage} tells. The transcript calls it for each row that it
	 * renders and gives the result to that message. Return `items` for the
	 * actions of the message, such as Edit and Retry, and `undefined` for the
	 * default menu alone. Return `false`, or pass `false` here for each
	 * message, to keep the native menu of the browser.
	 */
	contextMenu?: ((message: ChatMessageData) => ContextMenuConfig | false | undefined) | false
	/**
	 * The branches on the path that `messages` holds, by the id of the message
	 * that shows, as the `branches` of `useChatSend` gives them. A message with
	 * an entry of more than one branch shows a switcher below its bubble. Keep
	 * the identity stable while the branches stay the same.
	 */
	branches?: Readonly<Record<string, ChatBranch>>
	/**
	 * Fires with the id of the branch that the reader picks in the switcher of a
	 * message, as the `showBranch` of `useChatSend` takes it. Each switcher is
	 * off while `streaming`.
	 */
	onBranchChange?: (id: string) => void
	/**
	 * Fires with the id of a message, the id of an `action` block in it, and
	 * the result that the reader submitted, as the `submitAction` of
	 * `useChatSend` takes them. Without it, and while `streaming`, each action
	 * draws read-only.
	 */
	onActionSubmit?: (messageId: string, partId: string, result: ChatActionResult) => void
}

/** Props for {@link ChatTranscriptRow}. @internal */
type ChatTranscriptRowProps = Pick<
	ChatTranscriptProps,
	'contextMenu' | 'onBranchChange' | 'onActionSubmit'
> & {
	message: ChatMessageData
	/** The position of the message, which the window reads from `data-index`. */
	index: number
	/** The measure ref of the window. It keeps its identity. */
	ref: (node: Element | null) => void
	/** The gap above the message. */
	className: string
	streaming: boolean
	editing: boolean
	branch: ChatBranch | undefined
}

/**
 * The message of one row. The message is the row: the window measures its
 * root, so no box wraps it. It calls the row callbacks of the transcript, and
 * it is memoized on its props. A chunk keeps the object of each settled
 * message, so a settled row skips its render, also when it has a menu. That
 * holds while the callbacks keep their identity.
 *
 * @internal
 */
const ChatTranscriptRow = memo(function ChatTranscriptRow({
	message,
	index,
	ref,
	className,
	streaming,
	editing,
	contextMenu,
	branch,
	onBranchChange,
	onActionSubmit,
}: ChatTranscriptRowProps) {
	const { id } = message

	// Bound to the id of the message, so the bubble keeps one answer while the
	// id and the answer of the transcript stay the same.
	const actionSubmit = useMemo(
		() =>
			id && onActionSubmit
				? (partId: string, result: ChatActionResult) => onActionSubmit(id, partId, result)
				: undefined,
		[id, onActionSubmit],
	)

	return (
		<ChatMessage
			ref={ref}
			data-index={index}
			className={className}
			sender={message.sender}
			streaming={streaming}
			editing={editing}
			edited={message.edited}
			revised={message.revised}
			onActionSubmit={actionSubmit}
			failed={message.failed}
			timestamp={message.timestamp}
			contextMenu={contextMenu === false ? false : contextMenu?.(message)}
			branch={branch}
			onBranchChange={onBranchChange}
		>
			{message.content}
		</ChatMessage>
	)
})

/**
 * A chat transcript that renders a window over its messages, pinned to the
 * newest.
 *
 * @remarks
 * Each message's `sender` reaches {@link ChatMessage} unchanged, because the data
 * and the component spell the speaker axis the same way. When `streaming`, only
 * the last message pulses, and only when it is an assistant bubble.
 *
 * The transcript renders only the rows near the viewport, through the measured
 * path of {@link useVirtualWindow}. Two spacers stand in for the rows above and
 * below. A streamed chunk re-renders the rows in the window, not the whole
 * transcript.
 *
 * Each row measures its real height. A bubble that wraps, a step a reader
 * opens, and an embed that draws thus move the rows below them. The window keys
 * each row by its message `id`. A chunk keeps the ids, so the window keeps each
 * row position and does not rebuild them.
 *
 * The transcript scrolls only on the block axis. It opens at its newest row with
 * no animation, and it is then pinned to the end. While it is pinned, a new row
 * smooth-scrolls into view, and a row that grows keeps the end in view. The pin
 * is the intent of the reader, not the scroll position. Thus the transcript
 * also follows a reply that opens while the glide to the last message runs.
 *
 * Only a scroll of the reader toward the start releases the pin. A reader who
 * scrolled up to read is thus not pulled down. A transcript that gets back to
 * its end is pinned again: by a scroll, or by content that no longer overflows,
 * as after a branch switch. Any other move or resize that leaves a pinned
 * transcript short of its end takes it back there. That includes a correction
 * of the window as rows measure, a row that grows, and a viewport that gets
 * shorter. The reader's own message pins the transcript, wherever the reader
 * had scrolled, because the reader sent it.
 *
 * The scroll goes through the window, not through `scrollTop`. The total height
 * moves as rows measure, so a scroll written against `scrollHeight` drifts.
 * Mount the transcript fresh per conversation (e.g. `key`ed on its id), so a
 * switch does not start from the old scroll position.
 *
 * While the pin is released, a button at the bottom edge goes to the newest
 * message. Thus a reply that grows below the view does not go unseen. The press
 * pins the transcript again. After the press, the focus goes to the
 * transcript, which is a tab stop while it overflows.
 *
 * `contextMenu` gives each row the menu of a {@link ChatMessage}. Each message
 * has a menu with Copy unless `contextMenu` is `false`. The transcript calls
 * the callback only for the rows that it renders. Keep its identity stable, as
 * with `useCallback`, so a streamed chunk does not render the settled rows
 * again.
 *
 * `branches` gives a message the switcher of {@link ChatMessage}. The row of a
 * message with branches takes the key of its oldest branch, so a switch keeps
 * the row, and the focus in the switcher. The rows below it take the keys of
 * the turns that the branch shows. Each switcher is off while `streaming`, so
 * the reply that streams stays on the shown path.
 *
 * The window changes what an embed's `mount` policy can promise. A row that
 * leaves the window unmounts, with the views in it. Under `lazy`, an embed the
 * reader reached draws at once when its row returns, because
 * {@link ChatEmbedProvider} remembers it. The state the view held is gone. The
 * transcript cannot honor `always`: a view mounts only while its row renders.
 *
 * The pulse is visual only, so a reader who cannot see it is told the same
 * things through the shared live region (WCAG 4.1.3). Those are that a reply
 * started, and the reply once it settles. The region never speaks a chunk. A
 * reply rewrites itself many times a second, and a region that read every
 * rewrite would be worse than silence. An embedded view is counted rather than
 * read, because a chart ships its own hidden data table and the readout belongs
 * there.
 *
 * The transcript is a `log` named "Conversation", in the language of the
 * reader. It is a tab stop while it overflows, so a screen reader reads that
 * name when the focus goes to it. Pass `aria-label` or `aria-labelledby` to
 * give another name.
 *
 * The `aria-live` of the `log` is deliberately `off`. The role
 * says what the region is, so a reader can find it and knows entries arrive in
 * order. Leaving it live as well would put a second channel over one reply and
 * read it twice, once per streamed rewrite and once settled.
 *
 * The `log` holds a slice of the transcript, not all of it. A reader who walks
 * the region by virtual cursor finds the rows near the viewport, newest last.
 * Rows outside the slice render as the reader scrolls to them. The spacers are
 * hidden from assistive technology. The announcer is unaffected, because it
 * speaks a string and does not read the region.
 *
 * A switch of a branch speaks the new position of the switched message, such as
 * "Version 2 of 3". The path below that message changes, but its last reply is
 * not new, so the transcript does not speak it.
 *
 * A transcript that mounts with its history in hand announces nothing, because
 * the announcer baselines its first status. One whose `messages` arrive after
 * mount announces the last reply, which is right: from the reader's side, a
 * reply just landed.
 */
export function ChatTranscript({
	messages,
	streaming,
	editing,
	contextMenu,
	branches,
	onBranchChange,
	onActionSubmit,
	className,
	ref,
	onScroll,
	...props
}: ChatTranscriptProps) {
	const containerRef = useRef<HTMLDivElement>(null)

	// Safari does not focus a scroller, so the hook gives the transcript a tab
	// stop while it overflows. The hook takes no label, so the `log` role stays.
	// The element carries its name itself.
	const scrollRegionRef = useScrollRegion()

	// The window reads `containerRef`, so a consumer `ref` joins it.
	const setContainer = useComposedRefs(containerRef, scrollRegionRef, ref)

	const count = messages.length

	// A streamed chunk keeps the ids, so the key getter keeps its identity.
	const getItemKey = useChatTranscriptItemKey(messages, branches)

	const intl = useIntl()

	// A switch speaks its position from the switcher, so the transcript holds the
	// status that it spoke before the switch.
	const { status, hold } = useChatTranscriptStatus(
		describeTranscript(intl, messages, streaming),
		messages,
	)

	const switchBranch = useStableEvent((id: string) => {
		hold(id)

		onBranchChange?.(id)
	})

	// The switchers are off while a reply streams, because `useChatSend` ignores a
	// switch then. A button that looks live and does nothing would mislead.
	const branchChange = streaming === true || !onBranchChange ? undefined : switchBranch

	const submitAction = useStableEvent(
		(messageId: string, partId: string, result: ChatActionResult) =>
			onActionSubmit?.(messageId, partId, result),
	)

	// The asks are read-only while a reply streams, as the switchers are off,
	// because `useChatSend` ignores a submit then.
	const actionSubmit = streaming === true || !onActionSubmit ? undefined : submitAction

	const getScrollElement = useCallback(() => containerRef.current, [])

	// The follow glides, and jumps when the reader asks for reduced motion.
	const follow: ScrollBehavior = usePrefersReducedMotion() ? 'auto' : 'smooth'

	// The end anchor keeps a pinned transcript at its end while a row grows. The
	// append rule below follows a new row. Where the anchor does not hold the end,
	// as on iOS, the pin below takes the transcript back there.
	const { virtualItems, topSpacer, bottomSpacer, scrollToIndex, measureRef } = useVirtualWindow({
		count,
		getScrollElement,
		estimateSize: ESTIMATED_ROW_HEIGHT,
		overscan: OVERSCAN,
		getItemKey,
		anchorTo: 'end',
	})

	// Every scroll of the transcript goes to the end of its newest row.
	const goToEnd = (behavior?: typeof follow) => scrollToIndex(count - 1, { align: 'end', behavior })

	// Whether a glide to the end runs. The virtualizer moves the glide with the
	// end until it lands there, so the pin does not jump to the end meanwhile.
	const gliding = useRef(false)

	// A glide that starts at the end moves nothing, and no `scroll` event ends it.
	const glideToEnd = () => {
		const element = containerRef.current

		gliding.current = follow === 'smooth' && element !== null && !isAtEnd(element)

		goToEnd(follow)
	}

	// Whether the transcript follows its end. Only the reader releases it.
	const [pinned, setPinned] = useState(true)

	const lastScrollTop = useRef(0)

	// Whether the reader moved the scroll since the transcript last reached its
	// end: a wheel, a touch drag, a key, or a press on the scrollbar. Only such a
	// scroll releases the pin. The transcript and the browser also move the
	// scroll toward the start: the virtualizer corrects the offset as rows
	// measure, and the browser clamps it when the content gets shorter. On iOS,
	// the virtualizer holds back some of its corrections, and applies them as a
	// later jump. None of these is the reader, so none of them releases the pin,
	// and a pinned transcript goes back to its end.
	const reading = useRef(false)

	useEffect(() => {
		const element = containerRef.current

		if (!element) return

		const read = () => {
			reading.current = true
		}

		// A trackpad sends wheel events toward the end after the scroll stops
		// there. These events move nothing, and no scroll event clears them.
		const wheel = (event: WheelEvent) => {
			if (event.deltaY < 0) read()
		}

		// A press on the scroll itself, not on a row, is a press on the scrollbar.
		const press = (event: PointerEvent) => {
			if (event.target === element) read()
		}

		element.addEventListener('wheel', wheel, { passive: true })
		element.addEventListener('touchmove', read, { passive: true })
		element.addEventListener('keydown', read)
		element.addEventListener('pointerdown', press)

		return () => {
			element.removeEventListener('wheel', wheel)
			element.removeEventListener('touchmove', read)
			element.removeEventListener('keydown', read)
			element.removeEventListener('pointerdown', press)
		}
	}, [])

	// The pin holds the end. A move or a resize that leaves a pinned transcript
	// short of its end, and that the reader did not make, takes it back there.
	// The move can come from the virtualizer, from the browser, or from no
	// `scroll` event at all, as when a row grows or the viewport gets shorter.
	// A transcript at its end is pinned, whatever took it there. That includes
	// content that gets too short to overflow, as after a branch switch, for
	// which iOS sends no `scroll` event. A stable event, since it reads refs.
	const holdEnd = useStableEvent(() => {
		const element = containerRef.current

		if (!element) return

		if (isAtEnd(element)) {
			gliding.current = false

			reading.current = false

			setPinned(true)

			return
		}

		if (pinned && !reading.current && !gliding.current) goToEnd()
	})

	// A stable event, since it reads a ref and goes through `composeEventHandlers`.
	const trackPin = useStableEvent((event: UIEvent<HTMLDivElement>) => {
		const element = event.currentTarget

		const { scrollTop } = element

		if (!isAtEnd(element) && reading.current && scrollTop < lastScrollTop.current) {
			setPinned(false)
		}

		lastScrollTop.current = scrollTop

		// At the end, this pins the transcript again.
		holdEnd()
	})

	// A row that grows, a window that changes its spacers, and a viewport that
	// changes its height all move the end with no `scroll` event.
	const contentRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const element = containerRef.current

		const content = contentRef.current

		if (!element || !content) return

		const observer = new ResizeObserver(() => holdEnd())

		observer.observe(element)

		observer.observe(content)

		return () => observer.disconnect()
	}, [holdEnd])

	// The end anchor has no mount arm, so the first window that holds rows jumps
	// to the newest one. It runs before paint, so the transcript never shows its top.
	const opened = useRef(false)

	useLayoutEffect(() => {
		if (opened.current || virtualItems.length === 0) return

		opened.current = true

		goToEnd()

		// The browser reports this jump at the next frame. A scroll of the reader
		// before then is measured from here, not from the top.
		lastScrollTop.current = containerRef.current?.scrollTop ?? 0
	})

	// The newest row as the last commit held it. A row appended at the end
	// changes the newest key, and a row inserted above it does not.
	const newestKey = count > 0 ? getItemKey(count - 1) : undefined

	const newest = useRef({ count, key: newestKey })

	// A pinned transcript follows each new row. The reader's own message pins it
	// as well: the reader sent it, so they expect to see it, wherever they had
	// scrolled.
	useLayoutEffect(() => {
		const before = newest.current

		newest.current = { count, key: newestKey }

		if (!opened.current || count <= before.count || newestKey === before.key) return

		// One commit can hold the reader's message and the reply that opened
		// after it, so every row after the old newest counts, not just the last.
		let start = count

		while (start > 0 && getItemKey(start - 1) !== before.key) start--

		const sent = messages.slice(start).some((message) => message.sender === 'user')

		if (!pinned && !sent) return

		setPinned(true)

		glideToEnd()
	})

	const slots = k()

	useA11yAnnouncements(status)

	const measured = virtualItems.length > 0

	// The button leaves as the glide starts, so the focus goes to the transcript
	// and does not fall to the body.
	const goToNewest = () => {
		setPinned(true)

		glideToEnd()

		containerRef.current?.focus({ preventScroll: true })
	}

	// Until the window holds rows, the newest ones stand in. No spacer goes with
	// them, because nothing has measured where they sit.
	const tail = Math.max(count - UNMEASURED_ROWS, 0)

	const indexes = measured
		? virtualItems.map((item) => item.index)
		: Array.from({ length: count - tail }, (_, i) => tail + i)

	return (
		<div
			data-slot="chat-transcript"
			// A tab stop while it overflows, so it has a name. A consumer name replaces it.
			aria-label={intl.formatMessage(labels.conversation)}
			{...props}
			ref={setContainer}
			onScroll={composeEventHandlers(onScroll, trackPin)}
			role="log"
			aria-live="off"
			className={cn(slots.base, className)}
		>
			<div ref={contentRef}>
				{measured && topSpacer > 0 && <div aria-hidden="true" style={{ height: topSpacer }} />}
				{indexes.map((index) => {
					const message = messages[index]

					if (!message) return null

					const key = getItemKey(index)

					const branch = message.id ? branches?.[message.id] : undefined

					return (
						<ChatRowContext key={key} value={key}>
							<ChatTranscriptRow
								ref={measureRef}
								index={index}
								className={slots.row}
								message={message}
								streaming={
									streaming === true && message.sender === 'assistant' && index === count - 1
								}
								editing={editing !== undefined && message.id === editing}
								contextMenu={contextMenu}
								branch={branch}
								onBranchChange={branch && branchChange}
								onActionSubmit={actionSubmit}
							/>
						</ChatRowContext>
					)
				})}
				{measured && bottomSpacer > 0 && (
					<div aria-hidden="true" style={{ height: bottomSpacer }} />
				)}
			</div>
			{!pinned && (
				<div data-slot="chat-transcript-newest" className={slots.newest.base}>
					<Button
						type="button"
						variant="plain"
						size="sm"
						aria-label={intl.formatMessage(labels.newest)}
						className={slots.newest.button}
						onClick={goToNewest}
					>
						<Icon icon={ArrowDown} />
					</Button>
				</div>
			)}
		</div>
	)
}
