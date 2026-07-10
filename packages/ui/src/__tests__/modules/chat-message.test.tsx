import { describe, expect, it } from 'vitest'
import { ChatMessage } from '../../modules/chat'
import { bySlot, renderUI, screen, waitFor } from '../helpers'

describe('ChatMessage', () => {
	it('renders children inside the bubble slot', () => {
		const { container } = renderUI(<ChatMessage>Hello</ChatMessage>)

		expect(screen.getByText('Hello')).toBeInTheDocument()

		expect(bySlot(container, 'chat-message-bubble')).toBeInTheDocument()
	})

	it('defaults to an assistant message with no timestamp and no streaming pulse', () => {
		const { container } = renderUI(<ChatMessage>content</ChatMessage>)

		const el = bySlot(container, 'chat-message')

		expect(el).toHaveAttribute('data-type', 'assistant')

		expect(bySlot(container, 'chat-message-timestamp')).not.toBeInTheDocument()

		expect(bySlot(container, 'markdown')).not.toHaveClass('animate-pulse')
	})

	it('reflects the type prop on data-type', () => {
		const { container } = renderUI(<ChatMessage type="user">content</ChatMessage>)

		const el = bySlot(container, 'chat-message')

		expect(el).toHaveAttribute('data-type', 'user')
	})

	it('renders the timestamp slot when provided', () => {
		const { container } = renderUI(<ChatMessage timestamp="11:12 AM">content</ChatMessage>)

		const timestamp = bySlot(container, 'chat-message-timestamp')

		expect(timestamp).toBeInTheDocument()

		expect(timestamp).toHaveTextContent('11:12 AM')
	})

	it('pulses the bubble content while streaming', () => {
		const { container } = renderUI(<ChatMessage streaming>content</ChatMessage>)

		const markdown = bySlot(container, 'markdown')

		expect(markdown).toHaveClass('animate-pulse')

		expect(markdown).toHaveTextContent('content')
	})

	it('renders the actions slot when provided', () => {
		const { container } = renderUI(
			<ChatMessage actions={<button type="button">Copy</button>}>content</ChatMessage>,
		)

		const actions = bySlot(container, 'chat-message-actions')

		expect(actions).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
	})

	it('renders settled content as Markdown', () => {
		const { container } = renderUI(<ChatMessage>Some **bold** text</ChatMessage>)

		expect(bySlot(container, 'markdown')).toBeInTheDocument()

		expect(container.querySelector('strong')?.textContent).toBe('bold')
	})

	it('renders streaming content as Markdown, pulsing while it arrives', () => {
		const { container } = renderUI(<ChatMessage streaming>Some **bold** text</ChatMessage>)

		expect(bySlot(container, 'markdown')).toHaveClass('animate-pulse')

		expect(container.querySelector('strong')?.textContent).toBe('bold')
	})

	it('renders a chart fence as a live ChatChart, other fences as code blocks', async () => {
		const spec = JSON.stringify({
			type: 'line',
			title: 'Signups',
			data: [{ week: 'W1', signups: 12 }],
			series: [{ xKey: 'week', yKey: 'signups' }],
		})

		const content = `Here you go:\n\n\`\`\`chart\n${spec}\n\`\`\`\n\n\`\`\`tsx\nconst x = 1\n\`\`\``

		const { container } = renderUI(<ChatMessage>{content}</ChatMessage>)

		expect(bySlot(container, 'chat-chart')).toHaveAttribute('data-state', 'chart')

		// The tsx fence keeps the stock CodeBlock rendering beside the chart.
		expect(bySlot(container, 'code-block')).toBeInTheDocument()

		// Let the (mocked) async highlight land before teardown.
		await waitFor(() =>
			expect(container.querySelector('pre.shiki')).toHaveAttribute('data-lang', 'tsx'),
		)
	})

	it('shows a chart skeleton for an incomplete chart fence while streaming', () => {
		const content = '```chart\n{"type": "line", "data": ['

		const { container } = renderUI(<ChatMessage streaming>{content}</ChatMessage>)

		const chart = bySlot(container, 'chat-chart')

		expect(chart).toHaveAttribute('data-state', 'pending')

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it.each([
		'user',
		'assistant',
		'system',
	] as const)('injects no color override onto Markdown for the %s bubble — the prose inherits the bubble foreground', (type) => {
		const { container } = renderUI(<ChatMessage type={type}>content</ChatMessage>)

		// Markdown is color-agnostic and the bubble sets its own foreground, so
		// ChatMessage must not pour any `text-*` color (nor a per-element
		// override) onto the markdown wrapper — the bubble's color cascades in.
		const markdown = bySlot(container, 'markdown')

		expect(markdown?.className ?? '').not.toMatch(/text-(?:inherit|zinc|white|black)/)
		expect(markdown?.className ?? '').not.toMatch(/\[&_/)
	})
})
