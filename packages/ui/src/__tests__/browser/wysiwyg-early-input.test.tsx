import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { isApplePlatform } from '../../utilities/apple-platform'
import { present, renderUI, screen, waitFor } from '../helpers'
import { focusAtEnd, holdEditorLoad, load, Notes, value } from './helpers/wysiwyg-early-input'

/**
 * The input of a Wysiwyg before its editor loads. The browser makes each edit
 * of the text in a block in the markup of the field, and the field holds each
 * other input. The editor then takes the text and the caret of the markup,
 * and runs each held input in its order.
 *
 * Each case holds the load of the editor until it lets it go, as a slow page
 * does. `wysiwyg-early-composition.test.tsx` holds the cases of an input
 * method composition.
 */
holdEditorLoad()

describe('Wysiwyg input before the editor loads (real browser)', () => {
	it('shows the typed text at once, and keeps it and the caret when the editor loads', async () => {
		renderUI(<Notes initial="Launch" />)

		const field = focusAtEnd()

		await userEvent.keyboard(' day')

		// The browser made the keys in the markup, so the reader sees them.
		expect(field).toHaveTextContent('Launch day')

		const editor = await load()

		expect(editor).toHaveFocus()

		expect(value()).toBe('Launch day')

		await userEvent.keyboard('!')

		expect(value()).toBe('Launch day!')
	})

	it('puts the caret where the reader left it in the markup', async () => {
		renderUI(<Notes initial="Launch day" />)

		const field = screen.getByRole('textbox')

		field.focus()

		const text = present(field.querySelector('p'), 'the block').firstChild

		window.getSelection()?.collapse(text, 6)

		await userEvent.keyboard(' the')

		await load()

		await userEvent.keyboard(' big')

		expect(value()).toBe('Launch the big day')
	})

	it('takes a Home key just after the editor takes the focus from the markup', async () => {
		renderUI(<Notes initial="day" />)

		focusAtEnd()

		await load()

		await userEvent.keyboard('{Home}Launch ')

		expect(value()).toBe('Launch day')
	})

	it('turns a Markdown shortcut typed before the load into formatting', async () => {
		renderUI(<Notes />)

		focusAtEnd()

		await userEvent.keyboard('A **bold** word')

		const editor = await load()

		expect(editor.querySelector('strong')).toHaveTextContent('bold')

		expect(value()).toBe('A **bold** word')
	})

	it('holds Enter that sends until the editor has the text', async () => {
		const onEnter = vi.fn()

		renderUI(<Notes onEnter={onEnter} />)

		focusAtEnd()

		await userEvent.keyboard('Hello{Enter}')

		expect(onEnter).not.toHaveBeenCalled()

		await load()

		await waitFor(() => expect(onEnter).toHaveBeenCalledTimes(1))

		// The parent read the committed value at the send.
		expect(onEnter).toHaveBeenCalledWith('Hello')
	})

	it('holds each key after a held key, so the keys keep their order', async () => {
		renderUI(<Notes />)

		focusAtEnd()

		await userEvent.keyboard('One{Enter}Two{Backspace}o')

		// After the held Enter, the markup takes no more edits.
		expect(screen.getByRole('textbox')).toHaveTextContent(/^One$/)

		await load()

		await waitFor(() => expect(value()).toBe('One\n\nTwo'))
	})

	it('joins two blocks on a Backspace at the start of a block', async () => {
		renderUI(<Notes initial={'One\n\nTwo'} />)

		const field = screen.getByRole('textbox')

		field.focus()

		const second = present(field.querySelectorAll('p')[1], 'the second block')

		window.getSelection()?.collapse(second, 0)

		await userEvent.keyboard('{Backspace}')

		// The join waits for the editor: the markup keeps both blocks.
		expect(field.querySelectorAll('p')).toHaveLength(2)

		await load()

		await waitFor(() => expect(value()).toBe('OneTwo'))
	})

	it('runs a format shortcut and the keys after it in order', async () => {
		renderUI(<Notes />)

		focusAtEnd()

		await userEvent.keyboard('a{ControlOrMeta>}b{/ControlOrMeta}b')

		await load()

		await waitFor(() => expect(value()).toBe('a**b**'))
	})

	it('reads a paste as Markdown when the editor loads', async () => {
		renderUI(<Notes initial="See: " />)

		const field = focusAtEnd()

		const data = new DataTransfer()

		data.setData('text/plain', '**this**')

		field.dispatchEvent(
			new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
		)

		await userEvent.keyboard(' now')

		const editor = await load()

		// The caret is at the end of the pasted bold text, so the next keys are bold, as after the load.
		await waitFor(() => expect(value()).toBe('See: **this now**'))

		expect(editor.querySelector('strong')).toHaveTextContent('this')
	})

	it('types at the caret that the reader moved after a held key', async () => {
		renderUI(<Notes />)

		focusAtEnd()

		await userEvent.keyboard('hello{ControlOrMeta>}b{/ControlOrMeta}{Home}X')

		await load()

		await waitFor(() => expect(value()).toBe('Xhello'))
	})

	it('types in the text typed before the load at the caret that the reader moved there', async () => {
		renderUI(<Notes />)

		const field = focusAtEnd()

		await userEvent.keyboard('hello{ControlOrMeta>}b{/ControlOrMeta}')

		const text = present(field.querySelector('p'), 'the block').firstChild

		window.getSelection()?.collapse(text, 2)

		await userEvent.keyboard('X')

		await load()

		await waitFor(() => expect(value()).toBe('heXllo'))
	})

	it('keeps a value that the parent sets after a held press', async () => {
		renderUI(<Notes initial="Draft A" restore="Draft B" toolbar />)

		focusAtEnd()

		await userEvent.click(screen.getByRole('button', { name: 'Bold' }))

		await userEvent.click(screen.getByRole('button', { name: 'Restore' }))

		await load()

		await waitFor(() => expect(screen.getByRole('textbox')).toHaveTextContent('Draft B'))

		expect(value()).toBe('Draft B')
	})

	it('runs a list shortcut with Shift and a digit', async () => {
		renderUI(<Notes />)

		focusAtEnd()

		// On a US layout, the key of Shift+8 is `*`.
		await userEvent.keyboard('Item{ControlOrMeta>}{Shift>}{Digit8}{/Shift}{/ControlOrMeta}')

		await load()

		await waitFor(() => expect(value()).toBe('- Item'))
	})

	it('leaves a copy shortcut to the browser on a layout that moves the letters', async () => {
		renderUI(<Notes initial="Launch" />)

		const field = focusAtEnd()

		// On Dvorak, C is at the place of the I of QWERTY.
		const copy = new KeyboardEvent('keydown', {
			key: 'c',
			code: 'KeyI',
			keyCode: 67,
			ctrlKey: !isApplePlatform(),
			metaKey: isApplePlatform(),
			bubbles: true,
			cancelable: true,
		})

		field.dispatchEvent(copy)

		expect(copy.defaultPrevented).toBe(false)
	})

	it('pastes plain text in a code block', async () => {
		renderUI(<Notes initial={'```\ncode\n```'} />)

		const field = screen.getByRole('textbox')

		field.focus()

		const text = present(field.querySelector('code'), 'the code').firstChild

		window.getSelection()?.collapse(text, 4)

		const data = new DataTransfer()

		data.setData('text/plain', ' **plain**')

		data.setData('text/html', '<b>rich</b>')

		field.dispatchEvent(
			new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
		)

		await load()

		await waitFor(() => expect(value()).toBe('```\ncode **plain**\n```'))
	})

	it('takes no point from a block with a line break that the reader did not type', async () => {
		renderUI(<Notes initial="**bold**" />)

		const field = focusAtEnd()

		const strong = present(field.querySelector('strong'), 'the bold text')

		// Some browsers put a line break in a mark at the end of a block.
		strong.append(document.createElement('br'), document.createElement('br'))

		window.getSelection()?.collapse(strong, strong.childNodes.length)

		await load()

		expect(value()).toBe('**bold**')

		await userEvent.keyboard('!')

		await waitFor(() => expect(value()).toMatch(/!/))
	})

	it('runs a toolbar press and the keys after it in order', async () => {
		renderUI(<Notes toolbar />)

		focusAtEnd()

		await userEvent.keyboard('a')

		await userEvent.click(screen.getByRole('button', { name: 'Bold' }))

		await userEvent.keyboard('b')

		await load()

		await waitFor(() => expect(value()).toBe('a**b**'))
	})
})
