'use client'

import { useCallback, useLayoutEffect, useRef } from 'react'
import { cn } from '../../core'
import { useA11yAnnouncements, useVirtualWindow } from '../../hooks'
import { k } from '../../recipes/kata/chat-transcript'
import { ChatMessage } from './chat-message'
import { ChatRowContext } from './context'
import { describeTranscript } from './engine/chat-announcements'
import type { ChatMessageData } from './engine/types'
import { useChatTranscriptItemKey } from './use-chat-transcript-item-key'

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

/** Props for {@link ChatTranscript}. */
export type ChatTranscriptProps = {
	/**
	 * The transcript, oldest first. Give each message an `id`: the window keys
	 * each row and each measured height by it. A message with no id falls back
	 * to its index, which goes stale when messages are inserted above it.
	 */
	messages: ChatMessageData[]
	/** Whether a reply is currently streaming; marks the last message when it is an assistant bubble. */
	streaming?: boolean
	className?: string
}

/**
 * Renders a chat transcript as a window over its messages, pinned to the newest.
 *
 * @remarks
 * Each message's `role` reaches {@link ChatMessage} unchanged, because the data
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
 * The window changes what an embed's `mount` policy can promise. A row that
 * leaves the window unmounts, with the views in it. Under `lazy`, an embed the
 * reader reached draws at once when its row returns, because
 * {@link ChatEmbedProvider} remembers it. The state the view held is gone. The
 * transcript cannot honour `always`: a view mounts only while its row renders.
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
export function ChatTranscript({ messages, streaming, className }: ChatTranscriptProps) {
	const containerRef = useRef<HTMLDivElement>(null)

	const count = messages.length

	// A streamed chunk keeps the ids, so the key getter keeps its identity.
	const getItemKey = useChatTranscriptItemKey(messages)

	const getScrollElement = useCallback(() => containerRef.current, [])

	const { virtualItems, topSpacer, bottomSpacer, scrollToIndex, measureRef } = useVirtualWindow({
		count,
		getScrollElement,
		estimateSize: ESTIMATED_ROW_HEIGHT,
		overscan: OVERSCAN,
		getItemKey,
		anchorTo: 'end',
		followOnAppend: 'smooth',
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

		if (!messages.slice(start).some((message) => message.role === 'user')) return

		// Smooth, so a reader already at the end glides with the virtualizer's own
		// follow and does not jump.
		scrollToIndex(count - 1, { align: 'end', behavior: 'smooth' })
	})

	useA11yAnnouncements(describeTranscript(messages, streaming))

	const measured = virtualItems.length > 0

	// Until the window holds rows, the newest ones stand in. No spacer goes with
	// them, because nothing has measured where they sit.
	const tail = Math.max(count - UNMEASURED_ROWS, 0)

	const indexes = measured
		? virtualItems.map((item) => item.index)
		: Array.from({ length: count - tail }, (_, i) => tail + i)

	return (
		<div
			ref={containerRef}
			data-slot="chat-transcript"
			role="log"
			aria-live="off"
			className={cn(k(), className)}
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
								className={index > 0 ? cn(k.row) : undefined}
							>
								<ChatRowContext value={key}>
									<ChatMessage
										role={message.role}
										streaming={streaming && message.role === 'assistant' && index === count - 1}
										timestamp={message.timestamp}
									>
										{message.content}
									</ChatMessage>
								</ChatRowContext>
							</div>
						)
					})}
					{measured && bottomSpacer > 0 && (
						<div aria-hidden="true" style={{ height: bottomSpacer }} />
					)}
				</div>
			)}
		</div>
	)
}
