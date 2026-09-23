import { describe, expect, it } from 'vitest'
import type { ChatEmbedRenderer, ChatMessageData } from '../../modules/chat'
import { ChatEmbedProvider, ChatTranscript } from '../../modules/chat'
import { frames, hasIntermediate, renderUI, waitFor } from '../helpers'

/**
 * The transcript's window, in a real browser.
 *
 * The transcript renders the rows near its viewport and pins to its newest row
 * through the virtualizer. Each rule here is layout: a row height, a scroll
 * offset, a view that comes into sight. jsdom lays nothing out, so its window
 * never holds a row. These cases prove the pin on mount, the pin through a
 * streamed chunk, the follow while new rows measure, and the pin on the
 * reader's own message. They also prove the embed memory that outlives a row.
 */

const HEIGHT = 300

/** Filler that wraps to a number of lines set by the index, so no two rows share a height. */
const filler = (index: number) =>
	Array.from({ length: 1 + (index % 5) * 6 }, () => 'late stops rose').join(' ')

const history = (count: number): ChatMessageData[] =>
	Array.from({ length: count }, (_, index) => ({
		id: `m-${index}`,
		role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
		content: `Message ${index}. ${filler(index)}`,
	}))

/** A bounded transcript, as an app shell gives one. */
function Frame({ messages, streaming }: { messages: ChatMessageData[]; streaming?: boolean }) {
	return (
		<div className="flex flex-col" style={{ height: HEIGHT, width: 480 }}>
			<ChatTranscript messages={messages} streaming={streaming} />
		</div>
	)
}

function transcriptOf(container: HTMLElement) {
	const transcript = container.querySelector<HTMLElement>('[data-slot="chat-transcript"]')

	if (!transcript) throw new Error('transcript not found')

	return transcript
}

const rowsOf = (container: HTMLElement) =>
	Array.from(container.querySelectorAll<HTMLElement>('[data-slot="chat-transcript-row"]'))

/** How far the transcript sits above its own end, in pixels. */
function distanceFromEnd(transcript: HTMLElement) {
	return transcript.scrollHeight - transcript.clientHeight - transcript.scrollTop
}

/** Whether the row holding `text` is inside the transcript's viewport, bottom edge included. */
function showsEnd(transcript: HTMLElement, text: string) {
	const row = rowsOf(transcript).find((candidate) => candidate.textContent?.includes(text))

	if (!row) return false

	const box = transcript.getBoundingClientRect()

	const rect = row.getBoundingClientRect()

	return rect.bottom <= box.bottom + 1 && rect.bottom > box.top
}

/** Scrolls the transcript to `top` and waits for the window to follow. */
async function scrollTo(transcript: HTMLElement, top: number) {
	transcript.scrollTop = top

	transcript.dispatchEvent(new Event('scroll'))

	await frames()
}

describe('the transcript window', () => {
	it('opens at its newest row, and renders a window rather than every row', async () => {
		const messages = history(500)

		const { container } = renderUI(<Frame messages={messages} />)

		const transcript = transcriptOf(container)

		await waitFor(() => {
			expect(transcript.scrollTop).toBeGreaterThan(0)

			expect(distanceFromEnd(transcript)).toBeLessThanOrEqual(1)

			expect(showsEnd(transcript, 'Message 499.')).toBe(true)
		})

		expect(rowsOf(container).length).toBeLessThan(40)

		// The pin holds once the rows in view have measured, not only at the first write.
		await frames()

		expect(distanceFromEnd(transcript)).toBeLessThanOrEqual(1)
	})

	it('keeps the end in view while a streamed chunk grows the last row', async () => {
		const messages = history(200)

		const withReply = (content: string): ChatMessageData[] => [
			...messages,
			{ id: 'reply', role: 'assistant', content },
		]

		const { container, rerender } = renderUI(<Frame messages={withReply('Late')} streaming />)

		const transcript = transcriptOf(container)

		await waitFor(() => expect(distanceFromEnd(transcript)).toBeLessThanOrEqual(1))

		const before = transcript.scrollHeight

		// The count does not change: only the last row's content grows, chunk by chunk.
		for (let chunk = 1; chunk <= 4; chunk++) {
			rerender(
				<Frame messages={withReply(`Late ${filler(4).repeat(chunk)} end-${chunk}`)} streaming />,
			)

			await waitFor(() => {
				expect(distanceFromEnd(transcript)).toBeLessThanOrEqual(1)

				expect(showsEnd(transcript, `end-${chunk}`)).toBe(true)
			})
		}

		expect(transcript.scrollHeight).toBeGreaterThan(before + HEIGHT)
	})

	it('follows new rows smoothly while they measure, and lands on the newest', async () => {
		const messages = history(200)

		const { container, rerender } = renderUI(<Frame messages={messages} />)

		const transcript = transcriptOf(container)

		await waitFor(() => expect(distanceFromEnd(transcript)).toBeLessThanOrEqual(1))

		const start = transcript.scrollTop

		// Five rows, each far taller than the estimate, so the target moves as they measure.
		const appended: ChatMessageData[] = Array.from({ length: 5 }, (_, i) => ({
			id: `new-${i}`,
			role: 'assistant' as const,
			content: `New ${i}. ${filler(4).repeat(3)}`,
		}))

		const offsets: number[] = []

		let sampling = true

		const sample = () => {
			offsets.push(transcript.scrollTop)

			if (sampling) requestAnimationFrame(sample)
		}

		requestAnimationFrame(sample)

		rerender(<Frame messages={[...messages, ...appended]} />)

		await waitFor(() => {
			expect(distanceFromEnd(transcript)).toBeLessThanOrEqual(1)

			expect(showsEnd(transcript, 'New 4.')).toBe(true)
		})

		sampling = false

		const end = transcript.scrollTop

		// A travel, not a jump: at least one frame sat between the old end and the new one.
		expect(hasIntermediate(offsets, start, end)).toBe(true)

		// It stays landed once every new row has measured.
		await frames()

		expect(distanceFromEnd(transcript)).toBeLessThanOrEqual(1)
	})

	it('leaves a reader who scrolled up where they are when a row arrives', async () => {
		const messages = history(200)

		const { container, rerender } = renderUI(<Frame messages={messages} />)

		const transcript = transcriptOf(container)

		await waitFor(() => expect(distanceFromEnd(transcript)).toBeLessThanOrEqual(1))

		await scrollTo(transcript, transcript.scrollTop - 1_000)

		const reading = transcript.scrollTop

		rerender(
			<Frame messages={[...messages, { id: 'late', role: 'assistant', content: 'Late.' }]} />,
		)

		await frames()

		await frames()

		expect(Math.abs(transcript.scrollTop - reading)).toBeLessThanOrEqual(1)
	})

	it('takes a reader who scrolled up to the end when their own message arrives', async () => {
		const messages = history(200)

		const { container, rerender } = renderUI(<Frame messages={messages} />)

		const transcript = transcriptOf(container)

		await waitFor(() => expect(distanceFromEnd(transcript)).toBeLessThanOrEqual(1))

		await scrollTo(transcript, transcript.scrollTop - 1_000)

		expect(distanceFromEnd(transcript)).toBeGreaterThan(HEIGHT)

		rerender(<Frame messages={[...messages, { id: 'sent', role: 'user', content: 'Sent.' }]} />)

		await waitFor(() => {
			expect(distanceFromEnd(transcript)).toBeLessThanOrEqual(1)

			expect(showsEnd(transcript, 'Sent.')).toBe(true)
		})

		// It stays landed once the new row has measured.
		await frames()

		expect(distanceFromEnd(transcript)).toBeLessThanOrEqual(1)
	})

	it('takes the reader to the end when their message and its reply arrive in one commit', async () => {
		const messages = history(200)

		const { container, rerender } = renderUI(<Frame messages={messages} />)

		const transcript = transcriptOf(container)

		await waitFor(() => expect(distanceFromEnd(transcript)).toBeLessThanOrEqual(1))

		await scrollTo(transcript, transcript.scrollTop - 1_000)

		expect(distanceFromEnd(transcript)).toBeGreaterThan(HEIGHT)

		// A transport that resolves at once lands the reply beside the message.
		rerender(
			<Frame
				messages={[
					...messages,
					{ id: 'sent', role: 'user', content: 'Sent.' },
					{ id: 'reply', role: 'assistant', content: 'Reply.' },
				]}
			/>,
		)

		await waitFor(() => {
			expect(distanceFromEnd(transcript)).toBeLessThanOrEqual(1)

			expect(showsEnd(transcript, 'Reply.')).toBe(true)
		})
	})

	it('glides, not jumps, when a reader at the end sends a message', async () => {
		const messages = history(200)

		const { container, rerender } = renderUI(<Frame messages={messages} />)

		const transcript = transcriptOf(container)

		await waitFor(() => expect(distanceFromEnd(transcript)).toBeLessThanOrEqual(1))

		const start = transcript.scrollTop

		const offsets: number[] = []

		let sampling = true

		const sample = () => {
			offsets.push(transcript.scrollTop)

			if (sampling) requestAnimationFrame(sample)
		}

		requestAnimationFrame(sample)

		// Tall enough that a smooth travel takes more than one frame.
		rerender(
			<Frame
				messages={[
					...messages,
					{ id: 'sent', role: 'user', content: `Sent. ${filler(4).repeat(3)}` },
				]}
			/>,
		)

		await waitFor(() => {
			expect(distanceFromEnd(transcript)).toBeLessThanOrEqual(1)

			expect(showsEnd(transcript, 'Sent.')).toBe(true)
		})

		sampling = false

		expect(hasIntermediate(offsets, start, transcript.scrollTop)).toBe(true)
	})
})

describe('an embed under the window', () => {
	const drawn: ChatEmbedRenderer = () => <div data-testid="view" style={{ height: 120 }} />

	const renderers = { view: drawn }

	/** A long transcript with one view near its top. */
	const withView = (): ChatMessageData[] => {
		const messages = history(200)

		messages[1] = {
			id: 'm-1',
			role: 'assistant',
			content: [
				{ kind: 'text', id: 't', text: 'Here is the trend.' },
				{ kind: 'embed', id: 'e', name: 'view', data: null, height: 120 },
			],
		}

		return messages
	}

	/** Records each time a held-back embed enters the DOM or turns deferred. */
	function watchDeferral(root: HTMLElement) {
		let seen = 0

		const observer = new MutationObserver((records) => {
			for (const record of records) {
				const target = record.target as HTMLElement

				if (
					record.type === 'attributes' &&
					target.matches('[data-slot="chat-embed"][data-deferred]')
				) {
					seen++
				}

				for (const node of Array.from(record.addedNodes)) {
					if (!(node instanceof HTMLElement)) continue

					if (
						node.matches('[data-slot="chat-embed"][data-deferred]') ||
						node.querySelector('[data-slot="chat-embed"][data-deferred]')
					) {
						seen++
					}
				}
			}
		})

		observer.observe(root, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ['data-deferred'],
		})

		return {
			take: () => {
				const count = seen

				seen = 0

				return count
			},
			stop: () => observer.disconnect(),
		}
	}

	it('does not defer a second time after its row scrolls out and back', async () => {
		const { container } = renderUI(
			<ChatEmbedProvider renderers={renderers}>
				<Frame messages={withView()} />
			</ChatEmbedProvider>,
		)

		const transcript = transcriptOf(container)

		await waitFor(() => expect(distanceFromEnd(transcript)).toBeLessThanOrEqual(1))

		// Pinned to the end, the row with the view is outside the window.
		expect(container.querySelector('[data-slot="chat-embed"]')).toBeNull()

		const deferral = watchDeferral(transcript)

		// The first visit defers, then draws. This is the control for the watcher.
		await scrollTo(transcript, 0)

		await waitFor(() => expect(container.querySelector('[data-testid="view"]')).not.toBeNull())

		expect(deferral.take()).toBeGreaterThan(0)

		// Out of the window: the row, and the view in it, unmount.
		await scrollTo(transcript, transcript.scrollHeight)

		await waitFor(() => expect(container.querySelector('[data-slot="chat-embed"]')).toBeNull())

		deferral.take()

		// Back again: the view draws in the commit that mounts its row.
		await scrollTo(transcript, 0)

		await waitFor(() => expect(container.querySelector('[data-testid="view"]')).not.toBeNull())

		expect(deferral.take()).toBe(0)

		deferral.stop()
	})
})
