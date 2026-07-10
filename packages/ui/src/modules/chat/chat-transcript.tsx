'use client'

import { useCallback, useEffect, useRef } from 'react'
import { cn } from '../../core'
import { useVirtualWindow } from '../../hooks'
import { k } from '../../recipes/kata/chat-transcript'
import { ChatMessage } from './chat-message'
import type { ChatContent } from './types'
import { useChatScroll } from './use-chat-scroll'

/**
 * Estimated message height (px) seeding the virtualizer before a row is
 * measured — roughly a short bubble plus the transcript's row gap. Real
 * heights vary wildly (one-liners to chart-bearing essays), so every row
 * re-measures itself on mount and the estimate only shapes the initial
 * scrollbar. @internal
 */
const ESTIMATED_MESSAGE_HEIGHT = 96

/** Messages rendered beyond the viewport on each side under virtualization, when unset. @internal */
const DEFAULT_OVERSCAN = 10

/**
 * Cap on the windowed body's mount-settle bottom pins. Settling takes a few
 * commits (attach → estimated window → measured window); each changes the
 * scroll height and re-pins. The cap is an escape hatch far above that, so a
 * pathological measure loop can never hold the transcript pinned against the
 * user's scroll. @internal
 */
const MOUNT_PIN_LIMIT = 8

/** Windowing knobs for {@link ChatTranscriptProps.virtualize}; `true` takes every default. */
export type ChatTranscriptVirtualize =
	| boolean
	| {
			/**
			 * Estimated message height in pixels, seeding the virtualizer until each
			 * row measures itself.
			 * @defaultValue 96
			 */
			estimateSize?: number
			/**
			 * How many messages to render outside the viewport on each side.
			 * @defaultValue 10
			 */
			overscan?: number
	  }

/** Props for {@link ChatTranscript}. */
export type ChatTranscriptProps = {
	/** The transcript, oldest first. */
	messages: ChatContent[]
	/** Whether a reply is currently streaming; pulses the latest agent bubble. */
	streaming?: boolean
	/**
	 * Window the transcript through `@tanstack/react-virtual`, rendering only
	 * the messages in view (plus overscan) with spacers standing in for the
	 * rest. Rows measure their own rendered height, so bubbles of any size —
	 * one-liners, code fences, charts — window without drift. Reach for it on
	 * long transcripts (hundreds of messages); windowed-out messages leave the
	 * DOM, so find-in-page and screen readers see only the rendered window.
	 * @defaultValue false
	 */
	virtualize?: ChatTranscriptVirtualize
	className?: string
}

/**
 * Renders a chat transcript and auto-scrolls to the newest message.
 *
 * @remarks
 * Maps each message's `role` to the `ChatMessage` `type` (`agent` →
 * `assistant`). When `streaming`, only the last agent bubble pulses. Opens
 * already scrolled to the bottom (no animation), then smooth-scrolls there on
 * every subsequent `messages` change via {@link useChatScroll}, so streamed
 * chunks stay in view. Mount this fresh per conversation (e.g. `key`d on its
 * id) so switching chats doesn't animate from the old scroll position.
 *
 * With `virtualize`, the transcript is its own scroll container (the recipe's
 * `overflow-y-auto`) and only the windowed messages mount; give it a bounded
 * height (it already takes `flex-1 min-h-0` in a flex column). The pinned
 * scroll behaviour is unchanged — the sentinel rides below the bottom spacer,
 * so streamed chunks keep the newest bubble in view.
 */
export function ChatTranscript({ virtualize = false, ...props }: ChatTranscriptProps) {
	// Dispatch to hook-owning bodies so each path's hook order is fixed for its
	// component, whatever `virtualize` does between renders.
	if (virtualize) {
		return <ChatTranscriptVirtualized {...props} {...(virtualize === true ? {} : virtualize)} />
	}

	return <ChatTranscriptPlain {...props} />
}

type ChatTranscriptBodyProps = Omit<ChatTranscriptProps, 'virtualize'>

/**
 * One transcript bubble: the shared message → {@link ChatMessage} mapping both
 * transcript bodies render through. @internal
 */
function transcriptMessage(
	message: ChatContent,
	index: number,
	messages: ChatContent[],
	streaming: boolean | undefined,
) {
	return (
		<ChatMessage
			key={message.id ?? index}
			type={message.role === 'user' ? 'user' : 'assistant'}
			streaming={streaming && message.role === 'agent' && index === messages.length - 1}
			timestamp={message.timestamp}
		>
			{message.content}
		</ChatMessage>
	)
}

/** The unwindowed transcript body: every message mounts. @internal */
function ChatTranscriptPlain({ messages, streaming, className }: ChatTranscriptBodyProps) {
	const { ref } = useChatScroll(messages)

	return (
		<div data-slot="chat-transcript" className={cn(k(), className)}>
			{messages.length > 0 && (
				<>
					<div className="flex flex-col gap-6 mx-auto">
						{messages.map((message, index) =>
							transcriptMessage(message, index, messages, streaming),
						)}
					</div>
					<div ref={ref} />
				</>
			)}
		</div>
	)
}

/**
 * The windowed transcript body: only messages in view (plus overscan) mount,
 * `aria-hidden` spacers standing in for the rest so scroll height matches the
 * full transcript. Each row carries the virtualizer's `measureElement` ref and
 * re-measures its rendered height, so variable-height bubbles window without
 * drift; the between-message gap lives on the row (`pt-6`) rather than a flex
 * `gap`, so measurement includes it. @internal
 */
function ChatTranscriptVirtualized({
	messages,
	streaming,
	estimateSize = ESTIMATED_MESSAGE_HEIGHT,
	overscan = DEFAULT_OVERSCAN,
	className,
}: ChatTranscriptBodyProps & Exclude<ChatTranscriptVirtualize, boolean>) {
	const containerRef = useRef<HTMLDivElement>(null)

	const { ref } = useChatScroll(messages)

	const getScrollElement = useCallback(() => containerRef.current, [])

	const { virtualItems, topSpacer, bottomSpacer, measureElement } = useVirtualWindow({
		count: messages.length,
		getScrollElement,
		estimateSize,
		overscan,
	})

	// Mount-settle pin. The plain body opens on the bottom via useChatScroll's
	// before-paint jump, but here that jump fires on the windowed body's empty
	// first render (the virtualizer captures its scroll element in a later
	// layout effect) and moves nothing. Instead, re-pin the scroll offset to
	// the bottom after every commit while the mount is settling — attach, the
	// estimated window, then per-row measurement each change the scroll height
	// and trigger the next commit — and disarm at the first commit whose height
	// held steady, handing scroll control back to the user (and subsequent
	// appends back to useChatScroll's smooth sentinel scroll).
	const pinsLeft = useRef(MOUNT_PIN_LIMIT)

	const pinnedHeight = useRef(-1)

	useEffect(() => {
		if (pinsLeft.current <= 0) return

		const el = containerRef.current

		if (!el) return

		if (el.scrollHeight === pinnedHeight.current) {
			pinsLeft.current = 0

			return
		}

		pinsLeft.current -= 1

		pinnedHeight.current = el.scrollHeight

		el.scrollTop = el.scrollHeight
	})

	return (
		<div ref={containerRef} data-slot="chat-transcript" className={cn(k(), className)}>
			{messages.length > 0 && (
				<>
					<div className="mx-auto">
						{topSpacer > 0 && (
							<div
								data-slot="chat-transcript-spacer"
								aria-hidden="true"
								style={{ height: topSpacer }}
							/>
						)}
						{virtualItems.map((virtualItem) => {
							const message = messages[virtualItem.index] as ChatContent

							return (
								<div
									key={message.id ?? virtualItem.index}
									ref={measureElement}
									data-index={virtualItem.index}
									className={virtualItem.index > 0 ? 'pt-6' : undefined}
								>
									{transcriptMessage(message, virtualItem.index, messages, streaming)}
								</div>
							)
						})}
						{bottomSpacer > 0 && (
							<div
								data-slot="chat-transcript-spacer"
								aria-hidden="true"
								style={{ height: bottomSpacer }}
							/>
						)}
					</div>
					<div ref={ref} />
				</>
			)}
		</div>
	)
}
