import { describe, expect, it, vi } from 'vitest'
import { ChatPrompt } from '../../components/chat-prompt'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

function noop() {}

describe('ChatPrompt', () => {
	it('renders a textarea marked with data-slot="chat-prompt"', () => {
		const { container } = renderUI(<ChatPrompt value="" onValueChange={noop} onSubmit={noop} />)

		const el = bySlot(container, 'chat-prompt')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('TEXTAREA')
	})

	it('fires onValueChange when the user types', async () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(
			<ChatPrompt value="" onValueChange={onValueChange} onSubmit={noop} />,
		)

		const el = bySlot(container, 'chat-prompt') as HTMLTextAreaElement

		const user = userEvent.setup()

		await user.type(el, 'a')

		expect(onValueChange).toHaveBeenCalled()
	})

	it('submits on Enter when value is non-empty', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<ChatPrompt value="hello" onValueChange={noop} onSubmit={onSubmit} />,
		)

		const el = bySlot(container, 'chat-prompt') as HTMLTextAreaElement

		el.focus()

		const user = userEvent.setup()

		await user.keyboard('{Enter}')

		expect(onSubmit).toHaveBeenCalledOnce()
	})

	it('does not submit on Shift+Enter', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<ChatPrompt value="hello" onValueChange={noop} onSubmit={onSubmit} />,
		)

		const el = bySlot(container, 'chat-prompt') as HTMLTextAreaElement

		el.focus()

		const user = userEvent.setup()

		await user.keyboard('{Shift>}{Enter}{/Shift}')

		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('does not submit on Enter when value is blank', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<ChatPrompt value="   " onValueChange={noop} onSubmit={onSubmit} />,
		)

		const el = bySlot(container, 'chat-prompt') as HTMLTextAreaElement

		el.focus()

		const user = userEvent.setup()

		await user.keyboard('{Enter}')

		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('clicking send calls onSubmit', async () => {
		const onSubmit = vi.fn()

		renderUI(<ChatPrompt value="hello" onValueChange={noop} onSubmit={onSubmit} />)

		const send = screen.getByRole('button', { name: 'Send message' })

		const user = userEvent.setup()

		await user.click(send)

		expect(onSubmit).toHaveBeenCalledOnce()
	})

	it('disables send when value is blank', () => {
		renderUI(<ChatPrompt value="" onValueChange={noop} onSubmit={noop} />)

		expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
	})

	it('swaps send for stop when streaming', () => {
		renderUI(
			<ChatPrompt value="hello" onValueChange={noop} onSubmit={noop} onStop={noop} streaming />,
		)

		expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Stop generating' })).toBeInTheDocument()
	})

	it('clicking stop while streaming calls onStop', async () => {
		const onStop = vi.fn()

		renderUI(
			<ChatPrompt value="hello" onValueChange={noop} onSubmit={noop} onStop={onStop} streaming />,
		)

		const stop = screen.getByRole('button', { name: 'Stop generating' })

		const user = userEvent.setup()

		await user.click(stop)

		expect(onStop).toHaveBeenCalledOnce()
	})

	it('Enter while streaming calls onStop instead of onSubmit', async () => {
		const onSubmit = vi.fn()

		const onStop = vi.fn()

		const { container } = renderUI(
			<ChatPrompt
				value="hello"
				onValueChange={noop}
				onSubmit={onSubmit}
				onStop={onStop}
				streaming
			/>,
		)

		const el = bySlot(container, 'chat-prompt') as HTMLTextAreaElement

		el.focus()

		const user = userEvent.setup()

		await user.keyboard('{Enter}')

		expect(onSubmit).not.toHaveBeenCalled()

		expect(onStop).toHaveBeenCalledOnce()
	})

	it('renders actions before the send button', () => {
		renderUI(
			<ChatPrompt
				value=""
				onValueChange={noop}
				onSubmit={noop}
				actions={<button type="button">Attach</button>}
			/>,
		)

		expect(screen.getByRole('button', { name: 'Attach' })).toBeInTheDocument()
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<ChatPrompt value="" onValueChange={noop} onSubmit={noop} />, {
			skeleton: true,
		})

		expect(bySlot(container, 'chat-prompt')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})
