import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ChatPrompt } from '../../modules/chat'
import { bySlot, fireEvent, makeFileList, noop, renderUI, screen, userEvent } from '../helpers'

describe('ChatPrompt', () => {
	it('renders a textarea marked with data-slot="chat-prompt"', () => {
		const { container } = renderUI(<ChatPrompt value="" onValueChange={noop} onSubmit={noop} />)

		const el = bySlot(container, 'chat-prompt')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('TEXTAREA')
	})

	it('forwards ref to the underlying textarea', () => {
		const ref = createRef<HTMLTextAreaElement>()

		const { container } = renderUI(
			<ChatPrompt ref={ref} value="" onValueChange={noop} onSubmit={noop} />,
		)

		expect(ref.current).toBe(bySlot(container, 'chat-prompt'))
	})

	it('gives the composer a default accessible name', () => {
		renderUI(<ChatPrompt value="" onValueChange={noop} onSubmit={noop} />)

		expect(screen.getByRole('textbox', { name: 'Message' })).toBeInTheDocument()
	})

	it('respects an explicit aria-label', () => {
		renderUI(<ChatPrompt value="" onValueChange={noop} onSubmit={noop} aria-label="Reply" />)

		expect(screen.getByRole('textbox', { name: 'Reply' })).toBeInTheDocument()
	})

	it('uses aria-labelledby in place of the default name', () => {
		const { container } = renderUI(
			<>
				<span id="composer-label">Ask the assistant</span>
				<ChatPrompt
					value=""
					onValueChange={noop}
					onSubmit={noop}
					aria-labelledby="composer-label"
				/>
			</>,
		)

		const el = bySlot(container, 'chat-prompt') as HTMLTextAreaElement

		expect(el).toHaveAttribute('aria-labelledby', 'composer-label')

		expect(el).not.toHaveAttribute('aria-label')

		expect(screen.getByRole('textbox', { name: 'Ask the assistant' })).toBeInTheDocument()
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

	it('omits the attachment button when onAttach is not provided', () => {
		const { container } = renderUI(<ChatPrompt value="" onValueChange={noop} onSubmit={noop} />)

		expect(screen.queryByRole('button', { name: 'Add attachment' })).not.toBeInTheDocument()

		expect(container.querySelector('input[type="file"]')).not.toBeInTheDocument()
	})

	it('clicking the attachment button opens the file picker', async () => {
		const { container } = renderUI(
			<ChatPrompt value="" onValueChange={noop} onSubmit={noop} onAttach={noop} />,
		)

		const input = container.querySelector('input[type="file"]') as HTMLInputElement

		const openPicker = vi.spyOn(input, 'click')

		const user = userEvent.setup()

		await user.click(screen.getByRole('button', { name: 'Add attachment' }))

		expect(openPicker).toHaveBeenCalledOnce()
	})

	it('passes picked files to onAttach and clears the input for re-selection', () => {
		const onAttach = vi.fn()

		const { container } = renderUI(
			<ChatPrompt value="" onValueChange={noop} onSubmit={noop} onAttach={onAttach} />,
		)

		const input = container.querySelector('input[type="file"]') as HTMLInputElement

		const file = new File(['x'], 'loads.csv', { type: 'text/csv' })

		fireEvent.change(input, { target: { files: makeFileList([file]) } })

		expect(onAttach).toHaveBeenCalledWith([file])

		expect(input.value).toBe('')
	})

	it('forwards accept to the attachment file input', () => {
		const { container } = renderUI(
			<ChatPrompt
				value=""
				onValueChange={noop}
				onSubmit={noop}
				onAttach={noop}
				accept=".pdf,.csv"
			/>,
		)

		expect(container.querySelector('input[type="file"]')).toHaveAttribute('accept', '.pdf,.csv')
	})
})
