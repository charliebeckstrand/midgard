import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatEmbedProvider, ChatMessage } from '../../modules/chat'
import type { ChatEmbedPart } from '../../modules/chat/engine/chat-content/types'
import type { Mount } from '../../primitives/mount'
import { attach, bySlot, getSlot, renderUI, screen } from '../helpers'
import {
	type ControlledObserver,
	installControlledObserver,
	serverHtml,
} from '../helpers/controlled-intersection'
import { hydrate } from '../helpers/hydrate'

let observer: ControlledObserver

beforeEach(() => {
	observer = installControlledObserver()
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

/** A bubble that holds one embed of `trend`, under the given mount policy. */
function Message({ mount }: { mount?: Mount }) {
	return (
		<ChatEmbedProvider renderers={renderers} mount={mount}>
			<ChatMessage>{[embed()]}</ChatMessage>
		</ChatEmbedProvider>
	)
}

/** A bubble that holds one embed whose name no renderer claims. */
function Unclaimed() {
	return (
		<ChatEmbedProvider renderers={renderers}>
			<ChatMessage>{[embed({ name: 'unclaimed' })]}</ChatMessage>
		</ChatEmbedProvider>
	)
}

describe('a held-back embed', () => {
	it('does not call its renderer until the reader reaches it', () => {
		// The whole point: a transcript of fifty views mounts the ones a reader
		// sees, not the ones scrolled away above them.
		renderUI(<Message />)

		expect(chart).not.toHaveBeenCalled()

		expect(screen.queryByTestId('chart')).not.toBeInTheDocument()
	})

	it('holds its space with a placeholder, so the transcript does not lurch as one lands', () => {
		const { container } = renderUI(<Message />)

		const block = getSlot(container, 'chat-embed')

		expect(block).toHaveAttribute('data-deferred')

		expect(getSlot(block, 'placeholder').style.height).toBe('160px')
	})

	it('holds the space the part asks for', () => {
		const { container } = renderUI(
			<ChatEmbedProvider renderers={renderers}>
				<ChatMessage>{[embed({ height: 320 })]}</ChatMessage>
			</ChatEmbedProvider>,
		)

		expect(getSlot(container, 'placeholder').style.height).toBe('320px')
	})

	it('stops reserving space once it has drawn', () => {
		const { container } = renderUI(<Message />)

		observer.reveal()

		const block = getSlot(container, 'chat-embed')

		expect(block).not.toHaveAttribute('data-deferred')

		expect(bySlot(block, 'placeholder')).toBeNull()
	})

	it('keeps drawing once reached, so scrolling past does not tear it down', () => {
		// `lazy` mounts on first sight and holds. A view that remounted on every
		// scroll would lose whatever state it held and pay its cost again.
		renderUI(<Message />)

		observer.report(true)

		observer.report(false)

		expect(screen.getByTestId('chart')).toBeInTheDocument()
	})
})

describe('the mount policy', () => {
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
		const { container } = renderUI(<Message mount="always" />)

		expect(bySlot(container, 'chat-embed')).not.toHaveAttribute('data-deferred')
	})

	it('unmounts a view that scrolls away under `active`, and reserves its space again', () => {
		const { container } = renderUI(<Message mount="active" />)

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

	// The stated fallback is one line of text, so nothing is gained by holding
	// it back. A placeholder of the reserved height would only collapse to the
	// line when the reader reached it, and move the transcript under it.
	it('draws the module’s stated fallback at once, with no placeholder', () => {
		const { container } = renderUI(<Unclaimed />)

		expect(bySlot(container, 'chat-embed-fallback')).toBeInTheDocument()

		expect(bySlot(container, 'placeholder')).not.toBeInTheDocument()
	})

	it('defers the fallback of the provider, because it can draw a view', () => {
		const fallback = vi.fn(() => <div data-testid="fallback">drawn</div>)

		renderUI(
			<ChatEmbedProvider renderers={renderers} fallback={fallback}>
				<ChatMessage>{[embed({ name: 'unclaimed' })]}</ChatMessage>
			</ChatEmbedProvider>,
		)

		expect(fallback).not.toHaveBeenCalled()

		observer.reveal()

		expect(screen.getByTestId('fallback')).toBeInTheDocument()
	})
})

describe('the stated fallback on the server', () => {
	it('draws in the server markup, and hydrates with no mismatch', () => {
		const container = attach(document.createElement('div'))

		const html = serverHtml(<Unclaimed />)

		expect(html).toContain('data-slot="chat-embed-fallback"')

		expect(html).not.toContain('data-slot="placeholder"')

		container.innerHTML = html

		const { onRecoverableError } = hydrate(container, <Unclaimed />)

		expect(onRecoverableError).not.toHaveBeenCalled()
	})
})

describe.each(['lazy', 'active'] as const)('a held-back embed on the server, under %s', (mount) => {
	it('holds its space with a placeholder in the server markup, and draws no view', () => {
		const html = serverHtml(<Message mount={mount} />)

		expect(html).toContain('data-deferred')

		expect(html).toContain('data-slot="placeholder"')

		expect(html).toContain('height:160px')

		expect(html).not.toContain('drawn')
	})

	it('hydrates the server markup with no mismatch, and draws once the reader reaches it', () => {
		const container = attach(document.createElement('div'))

		container.innerHTML = serverHtml(<Message mount={mount} />)

		const { onRecoverableError } = hydrate(container, <Message mount={mount} />)

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(container).not.toHaveTextContent('drawn')

		observer.reveal()

		expect(container).toHaveTextContent('drawn')
	})
})

describe('an embed under always, on the server', () => {
	it('draws in the server markup, and hydrates with no mismatch', () => {
		const container = attach(document.createElement('div'))

		const html = serverHtml(<Message mount="always" />)

		expect(html).toContain('drawn')

		container.innerHTML = html

		const { onRecoverableError } = hydrate(container, <Message mount="always" />)

		expect(onRecoverableError).not.toHaveBeenCalled()
	})
})
