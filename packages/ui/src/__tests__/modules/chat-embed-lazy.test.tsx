import { act } from '@testing-library/react'
import { useEffect } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { ChatEmbedProvider, ChatMessage } from '../../modules/chat'
import type { ChatEmbedPart } from '../../modules/chat/engine/chat-content/types'
import type { Mount } from '../../primitives/mount'
import { attach, bySlot, getSlot, renderUI, screen } from '../helpers'
import {
	type ControlledObserver,
	installControlledObserver,
	serverMarkup,
} from '../helpers/controlled-intersection'

let observer: ControlledObserver

beforeEach(() => {
	observer = installControlledObserver()
})

afterEach(() => {
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

		observer.reveal()

		expect(screen.getByTestId('chart')).toBeInTheDocument()
	})

	it('holds its space open, so the transcript does not lurch as one lands', () => {
		const { container } = renderUI(
			<ChatEmbedProvider renderers={renderers}>
				<ChatMessage>{[embed()]}</ChatMessage>
			</ChatEmbedProvider>,
		)

		const block = getSlot(container, 'chat-embed')

		expect(block).toHaveAttribute('data-deferred')

		expect(block.style.minHeight).toBe('160px')
	})

	it('holds the space the part asks for', () => {
		const { container } = renderUI(
			<ChatEmbedProvider renderers={renderers}>
				<ChatMessage>{[embed({ height: 320 })]}</ChatMessage>
			</ChatEmbedProvider>,
		)

		expect(getSlot(container, 'chat-embed').style.minHeight).toBe('320px')
	})

	it('stops reserving space once it has drawn', () => {
		const { container } = renderUI(
			<ChatEmbedProvider renderers={renderers}>
				<ChatMessage>{[embed()]}</ChatMessage>
			</ChatEmbedProvider>,
		)

		observer.reveal()

		const block = getSlot(container, 'chat-embed')

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

		observer.report(true)

		observer.report(false)

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

	it('mounts every view live under `always`, before the reader reaches it', () => {
		// The observer here never reports, so every block stays out of view. A view
		// under `always` must still show and run its effects, not wait hidden.
		const mounted = vi.fn()

		function LiveView() {
			useEffect(() => mounted(), [])

			return <div data-testid="live">drawn</div>
		}

		renderUI(
			<ChatEmbedProvider renderers={{ trend: () => <LiveView /> }} mount="always">
				<ChatMessage>{[embed()]}</ChatMessage>
			</ChatEmbedProvider>,
		)

		expect(screen.getByTestId('live')).toBeVisible()

		expect(mounted).toHaveBeenCalledTimes(1)
	})

	it('reserves no space under `always`, because nothing is held back', () => {
		const { container } = renderUI(
			<ChatEmbedProvider renderers={renderers} mount="always">
				<ChatMessage>{[embed()]}</ChatMessage>
			</ChatEmbedProvider>,
		)

		expect(bySlot(container, 'chat-embed')).not.toHaveAttribute('data-deferred')
	})

	it('unmounts a view that scrolls away under `active`, and reserves its space again', () => {
		const { container } = renderUI(
			<ChatEmbedProvider renderers={renderers} mount="active">
				<ChatMessage>{[embed()]}</ChatMessage>
			</ChatEmbedProvider>,
		)

		observer.report(true)

		expect(screen.getByTestId('chart')).toBeInTheDocument()

		observer.report(false)

		expect(screen.queryByTestId('chart')).not.toBeInTheDocument()

		expect(getSlot(container, 'chat-embed')).toHaveAttribute('data-deferred')

		observer.report(true)

		expect(screen.getByTestId('chart')).toBeInTheDocument()
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

		observer.reveal()

		expect(bySlot(container, 'chat-embed-fallback')).toBeInTheDocument()
	})
})

function Message({ mount }: { mount?: Mount }) {
	return (
		<ChatEmbedProvider renderers={renderers} mount={mount}>
			<ChatMessage>{[embed()]}</ChatMessage>
		</ChatEmbedProvider>
	)
}

describe.each(['lazy', 'active'] as const)('a held-back embed on the server, under %s', (mount) => {
	it('reserves its space in the server markup, and draws no view', () => {
		const html = serverMarkup(<Message mount={mount} />)

		expect(html).toContain('data-deferred')

		expect(html).toContain('min-height:160px')

		expect(html).not.toContain('drawn')
	})

	it('hydrates the server markup with no mismatch, and draws once the reader reaches it', () => {
		const container = attach(document.createElement('div'))

		container.innerHTML = serverMarkup(<Message mount={mount} />)

		const onRecoverableError = vi.fn()

		let root: Root | undefined

		act(() => {
			root = hydrateRoot(container, <Message mount={mount} />, { onRecoverableError })
		})

		onTestFinished(() => act(() => root?.unmount()))

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(container).not.toHaveTextContent('drawn')

		observer.reveal()

		expect(container).toHaveTextContent('drawn')
	})
})

describe('an embed under always, on the server', () => {
	it('draws in the server markup, and hydrates with no mismatch', () => {
		const container = attach(document.createElement('div'))

		const html = serverMarkup(<Message mount="always" />)

		expect(html).toContain('drawn')

		container.innerHTML = html

		const onRecoverableError = vi.fn()

		let root: Root | undefined

		act(() => {
			root = hydrateRoot(container, <Message mount="always" />, { onRecoverableError })
		})

		onTestFinished(() => act(() => root?.unmount()))

		expect(onRecoverableError).not.toHaveBeenCalled()
	})
})
