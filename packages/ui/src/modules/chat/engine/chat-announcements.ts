/**
 * Pure builders for the transcript's polite a11y announcement (WCAG 4.1.3): the
 * one status string {@link ChatTranscript} narrates through the shared live
 * region when it changes. Kept pure and separate from the component so the
 * wording is unit-testable without rendering, as the grid's already is.
 *
 * The rule the whole increment rests on: say that a reply started, and say the
 * reply once it has settled. Never say a chunk. A reply rewrites itself many
 * times a second, and a region that read every rewrite would be worse than
 * silence.
 */

import { toChatParts } from './chat-content/normalize'
import { chatContentText } from './chat-content/text'
import type { ChatPart } from './chat-content/types'
import type { ChatMessageData } from './types'

/**
 * The announcement while a reply arrives. One string for the whole wait,
 * because the status is the same at every chunk and the announcer speaks only
 * on a change.
 *
 * @internal
 */
export const REPLY_STARTED = 'Assistant is replying'

/**
 * How many blocks in the content draw through the embed registry.
 *
 * @internal
 */
function embedCount(content: string | ChatPart[]): number {
	return toChatParts(content).filter((part) => part.kind === 'embed').length
}

/**
 * The announcement for one settled reply: its prose, and a count of the views
 * it carries.
 *
 * The views are counted, never named. An embed's `name` addresses a renderer —
 * `stops-trend` — and speaking it would read a developer's key to a reader who
 * cannot act on it. The count says a block is there and that the prose is not
 * the whole reply.
 *
 * The view's own content is not read here either, and that is the design rather
 * than a gap: a chart in the package ships its own hidden data table, so the
 * readout belongs to the embed and the transcript states only that one arrived.
 *
 * @internal
 */
export function describeReply(content: string | ChatPart[]): string {
	const spoken = chatContentText(content)

	const views = embedCount(content)

	if (views === 0) return spoken

	const summary = `${views} embedded ${views === 1 ? 'view' : 'views'}`

	return spoken ? `${spoken}\n\n${summary}` : summary
}

/**
 * What a reader is told about the transcript as it stands: that a reply is
 * arriving, or the last settled reply.
 *
 * A transcript whose last message is the reader's own says nothing. The reader
 * wrote it, so it is not news, and the reply to it has not started yet.
 *
 * @internal
 * @param messages - The transcript, oldest first.
 * @param streaming - Whether a reply is in flight. Absent reads as settled, so
 * the rule takes the transcript's own optional prop without a cast.
 */
export function describeTranscript(messages: ChatMessageData[], streaming = false): string {
	if (streaming) return REPLY_STARTED

	const last = messages.at(-1)

	return last?.role === 'assistant' ? describeReply(last.content) : ''
}
