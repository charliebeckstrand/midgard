import { describe, expect, it } from 'vitest'
import type { ChatMessageData } from '../../modules/chat'
import { ChatTranscript } from '../../modules/chat'
import { renderUI } from '../helpers'

/**
 * A transcript's auto-scroll must move its own scroll container and nothing
 * else.
 *
 * It used to reach for the nearest *overflowing* ancestor of a sentinel at the
 * transcript's end — and a transcript short enough not to overflow is not that
 * ancestor, so the search passed through it and scrolled whatever container
 * outside it did. In the docs, switching to the chat demo's Embeds tab scrolled
 * the whole content panel by 89 px; only that tab, because a deferred embed's
 * reserved height was what tipped the panel into overflowing.
 *
 * The hook now writes to the container it is handed, so no search can escape.
 * These cases hold the property rather than the mechanism: they would have
 * caught the old bug and they still pass if the mechanism changes again.
 *
 * Real browser, because the whole rule is layout: jsdom reports every
 * `scrollHeight` and `clientHeight` as zero.
 */

const short: ChatMessageData[] = [
	{ id: '1', role: 'user', content: 'How are late stops trending?' },
	{ id: '2', role: 'assistant', content: 'They rose from 4 to 14.' },
]

const long: ChatMessageData[] = Array.from({ length: 40 }, (_, index) => ({
	id: `m-${index}`,
	role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
	content: `Message ${index}, long enough to wrap and push the transcript past its own box.`,
}))

/** A tall page holding a bounded transcript, as a docs page or an app shell does. */
function page(messages: ChatMessageData[], transcriptHeight: string) {
	return (
		<div data-testid="outer" className="h-[300px] overflow-y-auto">
			<div className="h-[400px]">filler above</div>
			<div className={`flex flex-col ${transcriptHeight}`}>
				<ChatTranscript messages={messages} />
			</div>
			<div className="h-[400px]">filler below</div>
		</div>
	)
}

const outerOf = (container: HTMLElement) =>
	container.querySelector<HTMLElement>('[data-testid="outer"]')

const transcriptOf = (container: HTMLElement) =>
	container.querySelector<HTMLElement>('[data-slot="chat-transcript"]')

describe('ChatTranscript scroll confinement', () => {
	it('leaves the page where it was when the transcript has nothing to scroll', () => {
		// The regression. The transcript is taller than its content, so it never
		// overflows, and the only overflowing ancestor is the page.
		const { container } = renderUI(page(short, 'h-[600px]'))

		expect(outerOf(container)?.scrollTop).toBe(0)
	})

	it('still jumps its own container to the newest message', () => {
		// The confinement must not cost the behaviour it guards: a transcript that
		// does overflow still opens at the bottom.
		const { container } = renderUI(page(long, 'h-[200px]'))

		const transcript = transcriptOf(container)

		expect(transcript).not.toBeNull()

		expect(transcript?.scrollTop).toBeGreaterThan(0)
	})

	it('leaves the page where it was even while scrolling its own container', () => {
		const { container } = renderUI(page(long, 'h-[200px]'))

		expect(outerOf(container)?.scrollTop).toBe(0)
	})
})
