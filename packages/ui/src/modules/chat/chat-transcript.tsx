'use client'

import { cn } from '../../core'
import { useA11yAnnouncements } from '../../hooks'
import { k } from '../../recipes/kata/chat-transcript'
import { ChatMessage } from './chat-message'
import { describeTranscript } from './engine/chat-announcements'
import type { ChatMessageData } from './engine/types'
import { useChatScroll } from './use-chat-scroll'

/** Props for {@link ChatTranscript}. */
export type ChatTranscriptProps = {
	/** The transcript, oldest first. */
	messages: ChatMessageData[]
	/** Whether a reply is currently streaming; marks the latest assistant bubble. */
	streaming?: boolean
	className?: string
}

/**
 * Renders a chat transcript and auto-scrolls to the newest message.
 *
 * @remarks
 * Each message's `role` reaches {@link ChatMessage} unchanged, because the data
 * and the component spell the speaker axis the same way. When `streaming`, only
 * the last assistant bubble pulses. Opens already scrolled to the bottom (no
 * animation), then smooth-scrolls there on every subsequent `messages` change
 * via {@link useChatScroll}, so streamed chunks stay in view. Mount this fresh
 * per conversation (e.g. `key`d on its id) so switching chats doesn't animate
 * from the old scroll position.
 *
 * The pulse is visual only, so a reader who cannot see it is told the same
 * things through the shared live region (WCAG 4.1.3): that a reply started, and
 * the reply once it settles. Never a chunk — a reply rewrites itself many times
 * a second, and a region that read every rewrite would be worse than silence.
 * An embedded view is counted rather than read, because a chart ships its own
 * hidden data table and the readout belongs there.
 *
 * The transcript is a `log`, and its `aria-live` is deliberately `off`. The role
 * says what the region is, so a reader can find it and knows entries arrive in
 * order; leaving it live as well would put a second channel over one reply and
 * read it twice, once per streamed rewrite and once settled.
 *
 * A transcript that mounts with its history in hand announces nothing, because
 * the announcer baselines its first status. One whose `messages` arrive after
 * mount announces the last reply, which is right: from the reader's side, a
 * reply just landed.
 */
export function ChatTranscript({ messages, streaming, className }: ChatTranscriptProps) {
	const { containerRef } = useChatScroll(messages)

	useA11yAnnouncements(describeTranscript(messages, streaming))

	return (
		<div
			ref={containerRef}
			data-slot="chat-transcript"
			role="log"
			aria-live="off"
			className={cn(k(), className)}
		>
			{messages.length > 0 && (
				<div className="flex flex-col gap-6 mx-auto">
					{messages.map((message, index) => (
						<ChatMessage
							key={message.id ?? index}
							role={message.role}
							streaming={streaming && message.role === 'assistant' && index === messages.length - 1}
							timestamp={message.timestamp}
						>
							{message.content}
						</ChatMessage>
					))}
				</div>
			)}
		</div>
	)
}
