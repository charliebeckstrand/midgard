import { describe, expect, it, vi } from 'vitest'
import {
	ChatEmbedProvider,
	type ChatEmbedRenderer,
	ChatMessage,
	ChatTranscript,
} from '../../modules/chat'
import type { ChatEmbedPart, ChatPart } from '../../modules/chat/engine/chat-content/types'
import { allBySlot, bySlot, renderUI, screen } from '../helpers'

/** The gap slot every block after the first carries. */
const BLOCK_GAP = 'mt-3'

function text(id: string, value: string): ChatPart {
	return { kind: 'text', id, text: value }
}

function embed(id: string, name: string, data: unknown = { stops: 12 }): ChatEmbedPart {
	return { kind: 'embed', id, name, data }
}

/** Draws an embed's payload as text, so a test can read what reached the renderer. */
const stopsMap: ChatEmbedRenderer = (part) => (
	<div data-testid="stops-map">{JSON.stringify(part.data)}</div>
)

const renderers = { 'stops-map': stopsMap }

/** A bubble holding one embed, under the one renderer this suite registers. */
function renderEmbed(name: string) {
	return renderUI(
		<ChatEmbedProvider renderers={renderers}>
			<ChatMessage>{[embed('e1', name)]}</ChatMessage>
		</ChatEmbedProvider>,
	)
}

describe('ChatEmbedProvider', () => {
	it('draws a part through the renderer registered under its name', () => {
		renderEmbed('stops-map')

		expect(screen.getByTestId('stops-map')).toHaveTextContent('{"stops":12}')
	})

	it('hands the renderer the whole part, so it reads the id as well as the data', () => {
		const renderer = vi.fn<ChatEmbedRenderer>(() => null)

		renderUI(
			<ChatEmbedProvider renderers={{ 'stops-map': renderer }}>
				<ChatMessage>{[embed('e1', 'stops-map', { stops: 3 })]}</ChatMessage>
			</ChatEmbedProvider>,
		)

		expect(renderer).toHaveBeenCalledWith({
			kind: 'embed',
			id: 'e1',
			name: 'stops-map',
			data: { stops: 3 },
		})
	})

	it('stamps the embed name on the block, so a caller can style or find one', () => {
		const { container } = renderEmbed('stops-map')

		expect(bySlot(container, 'chat-embed')).toHaveAttribute('data-embed', 'stops-map')
	})

	describe('a name no renderer claims', () => {
		it('states the block rather than draws nothing', () => {
			// A silent gap reads as a reply that stopped. The reader is told a block
			// is there, and the name tells the developer which one to register.
			const { container } = renderEmbed('late-grid')

			expect(bySlot(container, 'chat-embed-fallback')).toHaveTextContent(
				'This chat cannot show a “late-grid” block.',
			)
		})

		it('states the block with no provider above it at all', () => {
			// A transcript of prose must render with no provider, so the context
			// carries an empty registry rather than throwing.
			const { container } = renderUI(<ChatMessage>{[embed('e1', 'stops-map')]}</ChatMessage>)

			expect(bySlot(container, 'chat-embed-fallback')).toHaveTextContent(
				'This chat cannot show a “stops-map” block.',
			)
		})

		it('draws the provider’s own fallback in place of the module’s line', () => {
			const { container } = renderUI(
				<ChatEmbedProvider
					renderers={renderers}
					fallback={(part) => <span data-testid="mine">no {part.name}</span>}
				>
					<ChatMessage>{[embed('e1', 'late-grid')]}</ChatMessage>
				</ChatEmbedProvider>,
			)

			expect(screen.getByTestId('mine')).toHaveTextContent('no late-grid')

			expect(bySlot(container, 'chat-embed-fallback')).not.toBeInTheDocument()
		})
	})

	describe('nesting', () => {
		it('merges an inner provider’s renderers with an outer provider’s', () => {
			renderUI(
				<ChatEmbedProvider renderers={renderers}>
					<ChatEmbedProvider
						renderers={{ 'late-grid': () => <div data-testid="late-grid">grid</div> }}
					>
						<ChatMessage>{[embed('e1', 'stops-map'), embed('e2', 'late-grid')]}</ChatMessage>
					</ChatEmbedProvider>
				</ChatEmbedProvider>,
			)

			expect(screen.getByTestId('stops-map')).toBeInTheDocument()

			expect(screen.getByTestId('late-grid')).toBeInTheDocument()
		})

		it('lets the inner provider win on a name they share', () => {
			renderUI(
				<ChatEmbedProvider renderers={renderers}>
					<ChatEmbedProvider renderers={{ 'stops-map': () => <div data-testid="mine">mine</div> }}>
						<ChatMessage>{[embed('e1', 'stops-map')]}</ChatMessage>
					</ChatEmbedProvider>
				</ChatEmbedProvider>,
			)

			expect(screen.getByTestId('mine')).toBeInTheDocument()

			expect(screen.queryByTestId('stops-map')).not.toBeInTheDocument()
		})

		it('keeps the outer fallback where the inner provider sets none', () => {
			renderUI(
				<ChatEmbedProvider renderers={{}} fallback={() => <span data-testid="outer">gone</span>}>
					<ChatEmbedProvider renderers={renderers}>
						<ChatMessage>{[embed('e1', 'late-grid')]}</ChatMessage>
					</ChatEmbedProvider>
				</ChatEmbedProvider>,
			)

			expect(screen.getByTestId('outer')).toBeInTheDocument()
		})
	})

	it('reaches an embed inside a transcript, which passes content through untouched', () => {
		renderUI(
			<ChatEmbedProvider renderers={renderers}>
				<ChatTranscript
					messages={[{ id: 'm1', role: 'assistant', content: [embed('e1', 'stops-map')] }]}
				/>
			</ChatEmbedProvider>,
		)

		expect(screen.getByTestId('stops-map')).toBeInTheDocument()
	})
})

describe('ChatMessage over parts', () => {
	it('draws one Markdown per text part rather than one over the join', () => {
		// Each part lexes on its own, so a settled block above a streaming one
		// skips its re-lex on every chunk.
		const { container } = renderUI(
			<ChatMessage>{[text('a', 'First block.'), text('b', 'Second block.')]}</ChatMessage>,
		)

		expect(allBySlot(container, 'markdown')).toHaveLength(2)
	})

	it('still draws exactly one Markdown for the string arm', () => {
		const { container } = renderUI(<ChatMessage>{'First block.\n\nSecond block.'}</ChatMessage>)

		expect(allBySlot(container, 'markdown')).toHaveLength(1)
	})

	it('sits the first block flush and gaps every block after it', () => {
		const { container } = renderUI(
			<ChatMessage>{[text('a', 'Twelve stops are late.'), embed('e1', 'stops-map')]}</ChatMessage>,
		)

		const [first] = allBySlot(container, 'markdown')

		expect(first).not.toHaveClass(BLOCK_GAP)

		expect(bySlot(container, 'chat-embed')).toHaveClass(BLOCK_GAP)
	})

	it('pulses the prose of a streaming reply and leaves a landed embed steady', () => {
		// The bubble projects the pulse onto its Markdown children, so an embed
		// that already arrived does not shimmer while the text after it streams.
		const { container } = renderUI(
			<ChatMessage streaming>{[embed('e1', 'stops-map'), text('a', 'Twelve…')]}</ChatMessage>,
		)

		expect(bySlot(container, 'chat-message-bubble')).toHaveClass(
			'[&>[data-slot=markdown]]:motion-safe:animate-pulse',
		)

		expect(bySlot(container, 'chat-embed')).not.toHaveClass('animate-pulse')
	})

	it('keys a block by the part’s id, so a merge by id holds the DOM node', () => {
		const { container, rerender } = renderUI(
			<ChatMessage>{[text('a', 'First block.'), text('b', 'Second block.')]}</ChatMessage>,
		)

		const [, second] = allBySlot(container, 'markdown')

		// Increment 5 merges a stream by id and never by index. A part inserted
		// ahead of another must not re-mount it.
		rerender(
			<ChatMessage>
				{[text('a', 'First block.'), text('c', 'Inserted.'), text('b', 'Second block.')]}
			</ChatMessage>,
		)

		expect(allBySlot(container, 'markdown')[2]).toBe(second)
	})
})
