import { act } from '@testing-library/react'
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
 *
 * The transcript is a window now, so the stream scenario must render the rows
 * a reader sees. jsdom lays nothing out: every height reads zero, and a window
 * over a zero-height viewport holds no rows. {@link modelLayout} gives the
 * transcript a viewport and each row a height. The window then resolves as it
 * does in a browser, and the pin puts the streaming reply inside it.
 */

/** The modelled viewport of the transcript, in pixels. */
const VIEWPORT = 600

/** The modelled height of every row, in pixels. It matches the transcript's own estimate. */
const ROW = 96

/** The transcript's scroll offset, per element, as the modelled layout stores it. */
const offsets = new WeakMap<Element, number>()

/**
 * Gives the transcript and its rows the geometry a browser would.
 *
 * @remarks
 * The model is small on purpose. The viewport has a fixed height, every row
 * has the same height, and a spacer has the height its style names. A scroll
 * write stores the offset and fires `scroll` in a microtask, which is the event
 * the virtualizer reads. Nothing else in this file reads geometry.
 */
function modelLayout() {
	const slot = (element: HTMLElement) => element.dataset.slot

	/** The content height: each spacer's own height, plus one row height per row. */
	const contentHeight = (element: HTMLElement) => {
		let height = 0

		for (const child of Array.from(element.firstElementChild?.children ?? [])) {
			const node = child as HTMLElement

			height +=
				slot(node) === 'chat-transcript-row' ? ROW : Number.parseFloat(node.style.height) || 0
		}

		return height
	}

	const define = (key: string, get: (element: HTMLElement) => number) => {
		Object.defineProperty(HTMLElement.prototype, key, {
			configurable: true,
			get(this: HTMLElement) {
				return get(this)
			},
		})
	}

	define('offsetHeight', (element) =>
		slot(element) === 'chat-transcript'
			? VIEWPORT
			: slot(element) === 'chat-transcript-row'
				? ROW
				: 0,
	)

	define('offsetWidth', (element) => (slot(element) === 'chat-transcript' ? 800 : 0))

	define('clientHeight', (element) => (slot(element) === 'chat-transcript' ? VIEWPORT : 0))

	define('scrollHeight', (element) =>
		slot(element) === 'chat-transcript' ? contentHeight(element) : 0,
	)

	Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
		configurable: true,
		get(this: HTMLElement) {
			return offsets.get(this) ?? 0
		},
		set(this: HTMLElement, value: number) {
			offsets.set(this, value)
		},
	})

	HTMLElement.prototype.scrollTo = function scrollTo(this: HTMLElement, options?: ScrollToOptions) {
		const top = options?.top ?? 0

		const max = Math.max(this.scrollHeight - this.clientHeight, 0)

		this.scrollTop = Math.min(Math.max(top, 0), max)

		// A browser fires `scroll` after the write, never inside it. A synchronous
		// event would land inside React's commit, which a browser never does.
		// The event re-renders the window, so it goes through `act` as a mount does.
		queueMicrotask(() => act(() => void this.dispatchEvent(new Event('scroll'))))
	} as HTMLElement['scrollTo']
}

modelLayout()

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
 * worth: a mounted embed is whatever its renderer costs.
 *
 * The window now bounds both rows of the pair. Only the rows in the modelled
 * viewport render, so `always` pays for about a dozen charts at every size,
 * not one per reply. The gap between the two rows is now the handful in view.
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
	// `always` against `lazy` is the saving deferring a renderer buys. Nothing
	// intersects here (`NeverInView` above), so `lazy` measures the floor: a
	// reader at the newest reply, with every view scrolled away. `always` mounts
	// every view live, so it measures the full cost. A real viewport shows a
	// handful, far nearer the floor.
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
