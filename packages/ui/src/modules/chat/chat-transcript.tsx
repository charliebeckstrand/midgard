'use client'

import { ArrowDown } from 'lucide-react'
import { useComposedRefs } from 'motion/react'
import {
	type ComponentProps,
	memo,
	type ReactNode,
	useCallback,
	useLayoutEffect,
	useRef,
} from 'react'
import { Button } from '../../components/button'
import type { ContextMenuEntry } from '../../components/context-menu/types'
import { Icon } from '../../components/icon'
import { cn } from '../../core/cn'
import { useA11yAnnouncements } from '../../hooks/a11y/use-a11y-announcements'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { useScrollRegion } from '../../hooks/use-scroll-region'
import { useVirtualWindow } from '../../hooks/use-virtual-window'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/chat-transcript'
import { ChatMessage, type ChatMessageProps } from './chat-message'
import { ChatRowContext } from './context'
import { describeTranscript } from './engine/chat-announcements'
import type { ChatMessageData } from './engine/types'
import { useChatTranscriptItemKey } from './use-chat-transcript-item-key'

const labels = defineMessages({
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
	 * Controls that act on one message, such as copy, retry, and edit. The
	 * transcript calls it for each row that it renders and gives the result to
	 * the `actions` of that {@link ChatMessage}. Return `undefined` for a message
	 * with no actions.
	 */
	actions?: (message: ChatMessageData) => ReactNode
	/**
	 * When `actions` show, as on {@link ChatMessage}: `'hover'` is a toolbar
	 * over the top corner of the bubble, and `'static'` is a row below it.
	 * @defaultValue 'hover'
	 * @media hover
	 */
	trigger?: ChatMessageProps['trigger']
	/**
	 * Entries of the menu that a right-click or a touch long press on one
	 * message opens. The transcript calls it for each row that it renders and
	 * gives the result to the `contextMenu` of that {@link ChatMessage}. Return
	 * `undefined` to keep the native menu of the browser on that message.
	 */
	contextMenu?: (message: ChatMessageData) => ContextMenuEntry[] | undefined
}

/** Props for {@link ChatTranscriptRow}. @internal */
type ChatTranscriptRowProps = Pick<ChatTranscriptProps, 'actions' | 'trigger' | 'contextMenu'> & {
	message: ChatMessageData
	streaming: boolean
}

/**
 * The message of one row. It calls the row callbacks of the transcript, and it
 * is memoized on its props. A chunk keeps the object of each settled message,
 * so a settled row skips its render, also when it has actions. That holds
 * while the callbacks keep their identity.
 *
 * @internal
 */
const ChatTranscriptRow = memo(function ChatTranscriptRow({
	message,
	streaming,
	actions,
	trigger,
	contextMenu,
}: ChatTranscriptRowProps) {
	return (
		<ChatMessage
			sender={message.sender}
			streaming={streaming}
			failed={message.failed}
			timestamp={message.timestamp}
			actions={actions?.(message)}
			trigger={trigger}
			contextMenu={contextMenu?.(message)}
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
 * below. Each row measures its real height. A bubble that wraps, a step a
 * reader opens, and an embed that draws thus move the rows below them. A
 * streamed chunk re-renders the rows in the window, not the whole transcript.
 * The window keys each row by its message `id`. A chunk keeps the ids, so the
 * window keeps each row position and does not rebuild them.
 *
 * The pin goes through the window, not through `scrollTop`. The total height
 * moves as rows measure, so a pin written against `scrollHeight` drifts. The
 * transcript opens at its newest row with no animation. The virtualizer then
 * anchors to the end: a row that grows keeps the end in view, and a new row
 * smooth-scrolls into view. Both happen only while the reader sits at the end,
 * so a reader who scrolled up to read is not pulled down. The reader's own
 * message is the exception. A new `user` row at the end pins the transcript to
 * it, wherever the reader had scrolled, because the reader sent it. Mount this
 * fresh per conversation (e.g. `key`ed on its id), so a switch does not start
 * from the old scroll position.
 *
 * A reader who scrolled up gets a button at the bottom edge that goes to the
 * newest message, so a reply that grows below the view does not go unseen. The
 * button shows exactly while an appended row would not pull the transcript
 * along. The follow and the pin do not show it. After the press, the focus
 * goes to the transcript, which is a tab stop while it overflows.
 *
 * `actions` and `contextMenu` give each row the controls and the menu of a
 * {@link ChatMessage}. The transcript calls them only for the rows that it
 * renders. Keep their identity stable, as with `useCallback`, so a streamed
 * chunk does not render the settled rows again. A `'hover'` toolbar floats
 * above its message, so the first row then keeps room above it, on a device
 * that hovers.
 *
 * The window changes what an embed's `mount` policy can promise. A row that
 * leaves the window unmounts, with the views in it. Under `lazy`, an embed the
 * reader reached draws at once when its row returns, because
 * {@link ChatEmbedProvider} remembers it. The state the view held is gone. The
 * transcript cannot honor `always`: a view mounts only while its row renders.
 *
 * The pulse is visual only, so a reader who cannot see it is told the same
 * things through the shared live region (WCAG 4.1.3). Those are that a reply
 * started, and the reply once it settles. Never a chunk. A reply rewrites itself
 * many times a second, and a region that read every rewrite would be worse than
 * silence.
 * An embedded view is counted rather than read, because a chart ships its own
 * hidden data table and the readout belongs there.
 *
 * The transcript is a `log`, and its `aria-live` is deliberately `off`. The role
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
 * A transcript that mounts with its history in hand announces nothing, because
 * the announcer baselines its first status. One whose `messages` arrive after
 * mount announces the last reply, which is right: from the reader's side, a
 * reply just landed.
 */
export function ChatTranscript({
	messages,
	streaming,
	actions,
	trigger,
	contextMenu,
	className,
	ref,
	...props
}: ChatTranscriptProps) {
	const containerRef = useRef<HTMLDivElement>(null)

	// Safari does not focus a scroller, so the hook gives the transcript a tab
	// stop while it overflows. With no label, the `log` role stays.
	const scrollRegionRef = useScrollRegion()

	// The window reads `containerRef`, so a consumer `ref` joins it.
	const setContainer = useComposedRefs(containerRef, scrollRegionRef, ref)

	const count = messages.length

	// A streamed chunk keeps the ids, so the key getter keeps its identity.
	const getItemKey = useChatTranscriptItemKey(messages)

	const getScrollElement = useCallback(() => containerRef.current, [])

	// The follow glides, and jumps when the reader asks for reduced motion.
	const follow: ScrollBehavior = usePrefersReducedMotion() ? 'auto' : 'smooth'

	const { virtualItems, topSpacer, bottomSpacer, away, scrollToIndex, measureRef } =
		useVirtualWindow({
			count,
			getScrollElement,
			estimateSize: ESTIMATED_ROW_HEIGHT,
			overscan: OVERSCAN,
			getItemKey,
			anchorTo: 'end',
			followOnAppend: follow,
		})

	// The end anchor has no mount arm, so the first window that holds rows jumps
	// to the newest one. It runs before paint, so the transcript never shows its top.
	const opened = useRef(false)

	useLayoutEffect(() => {
		if (opened.current || virtualItems.length === 0) return

		opened.current = true

		scrollToIndex(count - 1, { align: 'end' })
	})

	// The newest row as the last commit held it. A row appended at the end
	// changes the newest key, and a row inserted above it does not.
	const newestKey = count > 0 ? getItemKey(count - 1) : undefined

	const newest = useRef({ count, key: newestKey })

	// The follow acts only at the end, so the reader's own message pins here.
	// The reader sent it, so they expect to see it, wherever they had scrolled.
	useLayoutEffect(() => {
		const before = newest.current

		newest.current = { count, key: newestKey }

		if (!opened.current || count <= before.count || newestKey === before.key) return

		// One commit can hold the reader's message and the reply that opened
		// after it, so every row after the old newest counts, not just the last.
		let start = count

		while (start > 0 && getItemKey(start - 1) !== before.key) start--

		if (!messages.slice(start).some((message) => message.sender === 'user')) return

		// The behavior of the virtualizer's own follow, so a reader already at the
		// end glides with it and does not jump.
		scrollToIndex(count - 1, { align: 'end', behavior: follow })
	})

	const intl = useIntl()

	const slots = k()

	// A hover toolbar rises above its message, and the scroll clips it above the first row.
	const roomy = actions !== undefined && (trigger ?? 'hover') === 'hover'

	useA11yAnnouncements(describeTranscript(intl, messages, streaming))

	const measured = virtualItems.length > 0

	// The button leaves as the glide starts, so the focus goes to the transcript
	// and does not fall to the body.
	const goToNewest = () => {
		scrollToIndex(count - 1, { align: 'end', behavior: follow })

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
			{...props}
			ref={setContainer}
			role="log"
			aria-live="off"
			className={cn(slots.base, className)}
		>
			{count > 0 && (
				<div className="mx-auto">
					{measured && topSpacer > 0 && <div aria-hidden="true" style={{ height: topSpacer }} />}
					{indexes.map((index) => {
						const message = messages[index]

						if (!message) return null

						const key = getItemKey(index)

						return (
							<div
								key={key}
								ref={measureRef}
								data-index={index}
								data-slot="chat-transcript-row"
								className={index > 0 ? slots.row : roomy ? slots.first : undefined}
							>
								<ChatRowContext value={key}>
									<ChatTranscriptRow
										message={message}
										streaming={
											streaming === true && message.sender === 'assistant' && index === count - 1
										}
										actions={actions}
										trigger={trigger}
										contextMenu={contextMenu}
									/>
								</ChatRowContext>
							</div>
						)
					})}
					{measured && bottomSpacer > 0 && (
						<div aria-hidden="true" style={{ height: bottomSpacer }} />
					)}
				</div>
			)}
			{away && (
				<div data-slot="chat-transcript-newest" className={slots.newest}>
					<Button
						type="button"
						variant="plain"
						size="sm"
						aria-label={intl.formatMessage(labels.newest)}
						className={slots.newestButton}
						onClick={goToNewest}
					>
						<Icon icon={<ArrowDown />} />
					</Button>
				</div>
			)}
		</div>
	)
}
