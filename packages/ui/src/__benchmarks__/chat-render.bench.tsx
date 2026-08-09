import { describe } from 'vitest'
import type { ChatMessageData } from '../modules/chat'
import { ChatTranscript } from '../modules/chat'
import { makeTranscript } from './fixtures'
import { mountBenches, rerenderBench } from './harness'

/**
 * The transcript's render cost, where `chat-compute.bench.ts` measures the
 * transforms underneath it. Two scenarios, and the second is the one the module
 * had no number for: a reply arrives as a run of cumulative snapshots, and each
 * one re-renders a list that maps every message and an effect that runs per
 * change.
 *
 * `ChatMessage` is memoized on shallow-equal props, so a settled bubble should
 * skip both its re-render and its Markdown re-lex while only the streaming
 * bubble's `children` changes. The stream scenario is what holds that claim to
 * a number: if the memo works, its cost tracks the transcript's length only
 * through the `.map` that rebuilds the element list, not through five thousand
 * Markdown lexes.
 */

const SIZES = [50, 500, 5_000] as const

const TRANSCRIPTS = SIZES.map((size) => ({
	label: `${size.toLocaleString('en-US')} messages`,
	messages: makeTranscript(size),
}))

/** The chunks one streamed reply arrives in, cumulative as the transport yields them. */
const CHUNKS = [
	'Late',
	'Late stops rose',
	'Late stops rose from **4**',
	'Late stops rose from **4** to **14**',
	'Late stops rose from **4** to **14** across the week.',
] as const

describe('ChatTranscript · initial render', () => {
	mountBenches(
		TRANSCRIPTS,
		({ label }) => label,
		({ messages }) => <ChatTranscript messages={messages} />,
	)
})

describe(`ChatTranscript · streaming reply (${CHUNKS.length} chunks/iter)`, () => {
	for (const { label, messages } of TRANSCRIPTS) {
		// The reply the chunks land in, appended once so each iteration re-renders
		// the same transcript length the mount scenario measured.
		const withReply = (content: string): ChatMessageData[] => [
			...messages,
			{ id: 'reply', role: 'assistant', content },
		]

		rerenderBench(
			label,
			() => <ChatTranscript messages={withReply('')} streaming />,
			(rerender) => {
				for (const chunk of CHUNKS) {
					rerender(<ChatTranscript messages={withReply(chunk)} streaming />)
				}
			},
		)
	}
})
