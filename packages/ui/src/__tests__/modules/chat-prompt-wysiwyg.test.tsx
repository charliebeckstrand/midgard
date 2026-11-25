import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ChatPrompt } from '../../modules/chat'
import type { WysiwygHandle } from '../../modules/wysiwyg'
import { fireEvent, getSlot, noop, renderUI, screen, waitFor, within } from '../helpers'

/** Loads the editor through the first focus of the field, and gives its editable element. */
async function loadEditor(): Promise<HTMLElement> {
	fireEvent.focus(screen.getByRole('textbox'))

	await waitFor(() => expect(screen.getByRole('textbox')).toHaveClass('ProseMirror'))

	return screen.getByRole('textbox')
}

const SOURCES = [{ trigger: '@', target: 'datasets', label: 'Datasets', search: () => [] }]

describe('ChatPrompt with wysiwyg', () => {
	it.for([false, true])(
		'gives the field the props of the composer and the row of actions (wysiwyg %s)',
		(wysiwyg) => {
			const { container } = renderUI(
				<ChatPrompt
					value=""
					onValueChange={noop}
					onSubmit={noop}
					placeholder="Ask"
					rows={3}
					actions={<button type="button">Extra</button>}
					aria-describedby="status"
					wysiwyg={wysiwyg}
				/>,
			)

			const field = screen.getByRole('textbox', { name: 'Message' })

			expect(field.getAttribute(wysiwyg ? 'aria-placeholder' : 'placeholder')).toBe('Ask')

			if (wysiwyg) {
				const host = getSlot(container, 'wysiwyg')

				expect(host.style.getPropertyValue('--wysiwyg-rows')).toBe('3')
			} else expect(field).toHaveAttribute('rows', '3')

			expect(field).toHaveAttribute('aria-describedby', 'status')

			expect(screen.getByRole('button', { name: 'Extra' })).toBeInTheDocument()

			expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument()
		},
	)

	it('shows each action of the toolbar but Heading for `true`', () => {
		renderUI(<ChatPrompt value="" onValueChange={noop} onSubmit={noop} wysiwyg />)

		const toolbar = screen.getByRole('toolbar', { name: 'Formatting' })

		// More is inert while each action is on the row.
		expect(
			within(toolbar)
				.getAllByRole('button')
				.filter((button) => !button.closest('[inert]')),
		).toHaveLength(9)

		expect(within(toolbar).queryByRole('button', { name: 'Heading' })).toBeNull()

		expect(screen.queryByRole('toolbar', { name: 'Heading' })).toBeNull()
	})

	it('shows the actions that `{ actions }` gives, in that order', () => {
		renderUI(
			<ChatPrompt
				value=""
				onValueChange={noop}
				onSubmit={noop}
				wysiwyg={{ actions: ['code', 'bold'] }}
			/>,
		)

		expect(
			within(screen.getByRole('toolbar'))
				.getAllByRole('button')
				.filter((button) => !button.closest('[inert]'))
				.map((button) => button.ariaLabel),
		).toEqual(['Code', 'Bold'])
	})

	it('shows the formatting of the draft, and keeps the name of the composer', async () => {
		renderUI(<ChatPrompt value="**Ship** it" onValueChange={noop} onSubmit={noop} wysiwyg />)

		const field = await loadEditor()

		expect(field).toHaveAccessibleName('Message')

		expect(within(field).getByText('Ship').tagName).toBe('STRONG')
	})

	it('sends on Enter, and not while a reply streams', async () => {
		const onSubmit = vi.fn()

		const { rerender } = renderUI(
			<ChatPrompt value="Hello" onValueChange={noop} onSubmit={onSubmit} wysiwyg />,
		)

		const field = await loadEditor()

		fireEvent.keyDown(field, { key: 'Enter' })

		expect(onSubmit).toHaveBeenCalledTimes(1)

		rerender(
			<ChatPrompt value="Hello" onValueChange={noop} onSubmit={onSubmit} streaming wysiwyg />,
		)

		fireEvent.keyDown(field, { key: 'Enter' })

		expect(onSubmit).toHaveBeenCalledTimes(1)
	})

	it('calls onEscape on Escape', async () => {
		const onEscape = vi.fn()

		renderUI(
			<ChatPrompt value="" onValueChange={noop} onSubmit={noop} onEscape={onEscape} wysiwyg />,
		)

		const field = await loadEditor()

		fireEvent.keyDown(field, { key: 'Escape' })

		expect(onEscape).toHaveBeenCalledTimes(1)
	})

	it('gives the handle of the field to the ref', async () => {
		const ref = createRef<HTMLTextAreaElement | WysiwygHandle>()

		renderUI(<ChatPrompt ref={ref} value="Draft" onValueChange={noop} onSubmit={noop} wysiwyg />)

		await loadEditor()

		expect(ref.current).not.toBeInstanceOf(HTMLTextAreaElement)

		expect((ref.current as WysiwygHandle).value).toBe('Draft')
	})

	it('names the popup of the picker on the field for sources', () => {
		renderUI(<ChatPrompt value="" onValueChange={noop} onSubmit={noop} sources={SOURCES} wysiwyg />)

		const field = screen.getByRole('textbox')

		expect(field).toHaveAttribute('aria-haspopup', 'listbox')

		expect(field).toHaveAttribute('aria-autocomplete', 'list')
	})
})
