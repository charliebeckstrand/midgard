import { describe } from 'vitest'
import { BarChart } from '../modules/chart/bar-chart'
import type { ChatEmbedRenderer, ChatMessageData } from '../modules/chat'
import { ChatEmbedProvider, ChatTranscript } from '../modules/chat'
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

/**
 * A transcript where every reply carries a view, against the same transcript
 * carrying none.
 *
 * This is the cost lazy-loading an embed is meant to avoid, and it is a
 * different one from the stream scenario above — that transcript holds no embed
 * at all, so its per-chunk cost is text bubbles and cannot be moved by
 * deferring a renderer. The pair below is what says how much deferring is
 * worth: a mounted embed is whatever its renderer costs, and a transcript of
 * fifty pays fifty of them before a reader has scrolled to one.
 *
 * `BarChart` stands in for that renderer, because the seam exists for the
 * heaviest modules in the package and a light stand-in answers the wrong
 * question: a `Sparkline` per reply measured inside the noise of the same
 * transcript carrying none, which says nothing about a chart.
 */
const EMBED_SIZES = [50, 500] as const

const MONTHS = [
	{ month: 'Jan', late: 4 },
	{ month: 'Feb', late: 6 },
	{ month: 'Mar', late: 5 },
	{ month: 'Apr', late: 9 },
	{ month: 'May', late: 12 },
	{ month: 'Jun', late: 14 },
]

const chart: ChatEmbedRenderer = () => (
	<BarChart
		aria-label="Late stops by month"
		data={MONTHS}
		series={[{ xKey: 'month', yKey: 'late', yName: 'Late' }]}
	/>
)

const embedRenderers = { trend: chart }

/** The same transcript with a view on every assistant reply. */
function withEmbeds(messages: ChatMessageData[]): ChatMessageData[] {
	return messages.map((message, index) =>
		message.role === 'assistant'
			? {
					...message,
					content: [
						{ kind: 'text' as const, id: 't', text: String(message.content) },
						{ kind: 'embed' as const, id: `e-${index}`, name: 'trend', data: null },
					],
				}
			: message,
	)
}

// Nothing intersects. The bench env has no `IntersectionObserver` of its own,
// so without this every policy mounts eagerly and the pair below measures the
// same thing twice. A never-intersecting observer models the floor: a reader
// sitting at the newest reply, with every earlier view scrolled away. The truth
// for a real viewport is between the two rows — a handful of charts, far nearer
// this floor than the `always` ceiling.
class NeverInView {
	observe() {}
	unobserve() {}
	disconnect() {}
	takeRecords() {
		return []
	}
}

window.IntersectionObserver = NeverInView as unknown as typeof IntersectionObserver

const EMBED_TRANSCRIPTS = EMBED_SIZES.map((size) => ({
	label: `${size.toLocaleString('en-US')} messages`,
	messages: withEmbeds(makeTranscript(size)),
}))

describe('ChatTranscript · initial render, every reply carrying a view', () => {
	// `always` against `lazy` is the saving deferring a renderer buys. The bench
	// env reports every block as in view, so `lazy` here measures the machinery
	// rather than a scrolled transcript — the honest floor. A real viewport shows
	// a handful, and the gap widens to nearly the whole `always` cost.
	mountBenches(
		EMBED_TRANSCRIPTS,
		({ label }) => `${label} · always`,
		({ messages }) => (
			<ChatEmbedProvider renderers={embedRenderers} mount="always">
				<ChatTranscript messages={messages} />
			</ChatEmbedProvider>
		),
	)

	mountBenches(
		EMBED_TRANSCRIPTS,
		({ label }) => `${label} · lazy, none in view`,
		({ messages }) => (
			<ChatEmbedProvider renderers={embedRenderers}>
				<ChatTranscript messages={messages} />
			</ChatEmbedProvider>
		),
	)
})
