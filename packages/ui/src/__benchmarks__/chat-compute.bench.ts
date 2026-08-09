// @vitest-environment node

import { bench, describe } from 'vitest'
import { describeTranscript } from '../modules/chat/engine/chat-announcements'
import type { ChatPart } from '../modules/chat/engine/chat-content/types'
import {
	appendUserMessage,
	applyReplyChunk,
	dropEmptyReply,
	duplicateMessageIds,
	openReply,
	seedMessages,
	truncateToLastUserMessage,
} from '../modules/chat/engine/chat-transcript'
import { makeTranscript } from './fixtures'

/**
 * The chat's pure transforms: the rules `useChatSend` drives per send and per
 * streamed chunk, and the announcement the transcript derives per render.
 * `chat-render.bench.tsx` times the React tree over them one rung up.
 *
 * The axis is transcript length, because every rule here rebuilds the message
 * list. A chunk arrives many times a second and each one runs `applyReplyChunk`
 * over the whole transcript, so a per-message constant is worth five thousand
 * of itself in a long conversation — that is the claim these benches price.
 *
 * Node env, no DOM. The fixtures are LCG-seeded, so a run-to-run difference is
 * the code rather than the prose.
 */

const SIZES = [50, 500, 5_000] as const

const TRANSCRIPTS = SIZES.map((size) => ({
	label: `${size.toLocaleString('en-US')} messages`,
	messages: makeTranscript(size),
}))

/** A transcript with an open reply at its end, as the streaming path holds one. */
const STREAMING = TRANSCRIPTS.map(({ label, messages }) => ({
	label,
	messages: openReply(messages, 'reply'),
}))

/** A cumulative snapshot at the length a reply reaches part-way through. */
const SNAPSHOT = 'Late stops rose from **4** to **14** across the week, and most of the '

const CHART: ChatPart[] = [{ kind: 'embed', id: 'e1', name: 'stops-trend', data: [4, 14] }]

describe('chat-transcript · applyReplyChunk (per streamed chunk)', () => {
	// The one transform on the streaming hot path. It maps the whole list to
	// reach one reply, so its cost is the transcript's length rather than the
	// reply's — the number that decides whether a long conversation streams as
	// smoothly as a short one.
	for (const { label, messages } of STREAMING) {
		bench(`${label} · string chunk`, () => {
			applyReplyChunk(messages, 'reply', SNAPSHOT)
		})
	}

	for (const { label, messages } of STREAMING) {
		bench(`${label} · part chunk`, () => {
			applyReplyChunk(messages, 'reply', CHART)
		})
	}
})

describe('chat-transcript · the send path (once per send)', () => {
	for (const { label, messages } of TRANSCRIPTS) {
		bench(`${label} · appendUserMessage`, () => {
			appendUserMessage(messages, 'u-new', 'Re-sequence them.')
		})
	}

	for (const { label, messages } of TRANSCRIPTS) {
		bench(`${label} · truncateToLastUserMessage`, () => {
			truncateToLastUserMessage(messages)
		})
	}

	for (const { label, messages } of STREAMING) {
		bench(`${label} · dropEmptyReply`, () => {
			dropEmptyReply(messages, 'reply')
		})
	}
})

describe('chat-transcript · the seed path (once per mount)', () => {
	// A reload hands the hook a whole persisted conversation. Both rules walk it
	// before the first paint, so they sit on the mount critical path.
	for (const { label, messages } of TRANSCRIPTS) {
		bench(`${label} · seedMessages`, () => {
			let next = 0

			seedMessages(messages, () => `minted-${next++}`)
		})
	}

	for (const { label, messages } of TRANSCRIPTS) {
		bench(`${label} · duplicateMessageIds`, () => {
			duplicateMessageIds(messages)
		})
	}
})

describe('chat-announcements · describeTranscript (per render)', () => {
	// Derived on every render of the transcript, streaming or settled. The
	// streaming arm returns before it reads the list at all, which is what keeps
	// a hundred chunks one announcement; the settled arm projects the last reply
	// alone. Both should be flat across the axis, and this is where that is
	// checked rather than asserted.
	for (const { label, messages } of TRANSCRIPTS) {
		bench(`${label} · streaming`, () => {
			describeTranscript(messages, true)
		})
	}

	for (const { label, messages } of TRANSCRIPTS) {
		bench(`${label} · settled`, () => {
			describeTranscript(messages, false)
		})
	}
})
