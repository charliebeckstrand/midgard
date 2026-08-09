import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatEmbedProvider, ChatMessage } from '../../modules/chat'
import type { ChatEmbedPart } from '../../modules/chat/engine/chat-content/types'
import { bySlot, present, renderUI, screen } from '../helpers'

/**
 * A controllable `IntersectionObserver`: nothing intersects until a test says
 * so. The shared jsdom stub reports every target as visible on observe, which
 * is the right default for suites that only want their content drawn; this one
 * replaces it so the deferral itself can be stated.
 */
let reveal: (() => void) | undefined

const original = window.IntersectionObserver

beforeEach(() => {
	const observed: { target: Element; callback: IntersectionObserverCallback }[] = []

	class ControlledObserver {
		private readonly callback: IntersectionObserverCallback

		constructor(callback: IntersectionObserverCallback) {
			this.callback = callback
		}

		observe(target: Element) {
			observed.push({ target, callback: this.callback })
		}

		unobserve() {}
		disconnect() {}
		takeRecords() {
			return []
		}
	}

	window.IntersectionObserver = ControlledObserver as unknown as typeof IntersectionObserver

	reveal = () => {
		act(() => {
			for (const { target, callback } of observed.splice(0)) {
				callback(
					[{ target, isIntersecting: true } as IntersectionObserverEntry],
					{} as IntersectionObserver,
				)
			}
		})
	}
})

afterEach(() => {
	window.IntersectionObserver = original

	reveal = undefined

	chart.mockClear()
})

const chart = vi.fn(() => <div data-testid="chart">drawn</div>)

const renderers = { trend: chart }

const embed = (overrides: Partial<ChatEmbedPart> = {}): ChatEmbedPart => ({
	kind: 'embed',
	id: 'e1',
	name: 'trend',
	data: null,
	...overrides,
})

describe('a held-back embed', () => {
	it('does not call its renderer until the reader reaches it', () => {
		// The whole point: a transcript of fifty views mounts the ones a reader
		// sees, not the ones scrolled away above them.
		renderUI(
			<ChatEmbedProvider renderers={renderers}>
				<ChatMessage>{[embed()]}</ChatMessage>
			</ChatEmbedProvider>,
		)

		expect(chart).not.toHaveBeenCalled()

		expect(screen.queryByTestId('chart')).not.toBeInTheDocument()
	})

	it('draws once the reader reaches it', () => {
		renderUI(
			<ChatEmbedProvider renderers={renderers}>
				<ChatMessage>{[embed()]}</ChatMessage>
			</ChatEmbedProvider>,
		)

		reveal?.()

		expect(screen.getByTestId('chart')).toBeInTheDocument()
	})

	it('holds its space open, so the transcript does not lurch as one lands', () => {
		const { container } = renderUI(
			<ChatEmbedProvider renderers={renderers}>
				<ChatMessage>{[embed()]}</ChatMessage>
			</ChatEmbedProvider>,
		)

		const block = present(bySlot(container, 'chat-embed'), 'embed')

		expect(block).toHaveAttribute('data-deferred')

		expect(block.style.minHeight).toBe('160px')
	})

	it('holds the space the part asks for', () => {
		const { container } = renderUI(
			<ChatEmbedProvider renderers={renderers}>
				<ChatMessage>{[embed({ height: 320 })]}</ChatMessage>
			</ChatEmbedProvider>,
		)

		expect(present(bySlot(container, 'chat-embed'), 'embed').style.minHeight).toBe('320px')
	})

	it('stops reserving space once it has drawn', () => {
		const { container } = renderUI(
			<ChatEmbedProvider renderers={renderers}>
				<ChatMessage>{[embed()]}</ChatMessage>
			</ChatEmbedProvider>,
		)

		reveal?.()

		const block = present(bySlot(container, 'chat-embed'), 'embed')

		expect(block).not.toHaveAttribute('data-deferred')

		expect(block.style.minHeight).toBe('')
	})

	it('keeps drawing once reached, so scrolling past does not tear it down', () => {
		// `lazy` mounts on first sight and holds. A view that remounted on every
		// scroll would lose whatever state it held and pay its cost again.
		renderUI(
			<ChatEmbedProvider renderers={renderers}>
				<ChatMessage>{[embed()]}</ChatMessage>
			</ChatEmbedProvider>,
		)

		reveal?.()

		expect(screen.getByTestId('chart')).toBeInTheDocument()
	})
})

describe('the mount policy', () => {
	it('draws every renderer up front under `always`', () => {
		renderUI(
			<ChatEmbedProvider renderers={renderers} mount="always">
				<ChatMessage>{[embed()]}</ChatMessage>
			</ChatEmbedProvider>,
		)

		expect(screen.getByTestId('chart')).toBeInTheDocument()
	})

	it('reserves no space under `always`, because nothing is held back', () => {
		const { container } = renderUI(
			<ChatEmbedProvider renderers={renderers} mount="always">
				<ChatMessage>{[embed()]}</ChatMessage>
			</ChatEmbedProvider>,
		)

		expect(bySlot(container, 'chat-embed')).not.toHaveAttribute('data-deferred')
	})

	it('is inherited by a nested provider that sets none', () => {
		renderUI(
			<ChatEmbedProvider renderers={{}} mount="always">
				<ChatEmbedProvider renderers={renderers}>
					<ChatMessage>{[embed()]}</ChatMessage>
				</ChatEmbedProvider>
			</ChatEmbedProvider>,
		)

		expect(screen.getByTestId('chart')).toBeInTheDocument()
	})

	it('defers the module’s stated fallback too, since it is a block like any other', () => {
		const { container } = renderUI(
			<ChatEmbedProvider renderers={renderers}>
				<ChatMessage>{[embed({ name: 'unclaimed' })]}</ChatMessage>
			</ChatEmbedProvider>,
		)

		expect(bySlot(container, 'chat-embed-fallback')).not.toBeInTheDocument()

		reveal?.()

		expect(bySlot(container, 'chat-embed-fallback')).toBeInTheDocument()
	})
})
