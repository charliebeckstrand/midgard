import { useRef, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cdp, userEvent } from 'vitest/browser'
import { Wysiwyg, WysiwygToolbar } from '../../modules/wysiwyg'
import { __resetWysiwygEngine } from '../../modules/wysiwyg/use-wysiwyg-editor'
import { present, renderUI, screen, waitFor } from '../helpers'
import { pause } from './helpers/wall-clock'

/**
 * The input of a Wysiwyg before its editor loads. The browser makes each edit
 * of the text in a block in the markup of the field, and the field holds each
 * other input. The editor then takes the text and the caret of the markup,
 * and runs each held input in its order.
 *
 * Each case holds the load of the editor until it lets it go, as a slow page
 * does.
 */
const gate = { wait: Promise.resolve(), open: () => {} }

beforeEach(() => {
	gate.wait = new Promise((resolve) => {
		gate.open = resolve
	})

	const { wait } = gate

	__resetWysiwygEngine(() => wait.then(() => import('../../modules/wysiwyg/wysiwyg-editor')))
})

afterEach(() => gate.open())

/** A field that shows its Markdown value, and the value at each call of `onEnter`. */
function Notes({
	initial = '',
	onEnter,
	toolbar = false,
}: {
	initial?: string
	onEnter?: (value: string) => void
	toolbar?: boolean
}) {
	const [value, setValue] = useState(initial)

	const current = useRef(value)

	current.current = value

	return (
		<>
			<Wysiwyg
				aria-label="Notes"
				value={value}
				onValueChange={setValue}
				onEnter={onEnter && (() => onEnter(current.current))}
			>
				{toolbar && <WysiwygToolbar />}
			</Wysiwyg>
			<output data-testid="value">{value}</output>
		</>
	)
}

const value = () => screen.getByTestId('value').textContent

/**
 * The field before the load, with the focus and the caret at the end of its
 * text, as a press after the text puts it.
 */
function focusAtEnd(): HTMLElement {
	const field = screen.getByRole('textbox')

	expect(field).not.toHaveClass('ProseMirror')

	field.focus()

	const block = present(field.querySelector('p:last-of-type'), 'a block')

	const text = block.lastChild?.nodeType === Node.TEXT_NODE ? block.lastChild : null

	window.getSelection()?.collapse(text ?? block, text ? (text.nodeValue?.length ?? 0) : 0)

	return field
}

/** Lets the load go, and gives the editable element of the editor. */
async function load(): Promise<HTMLElement> {
	gate.open()

	await waitFor(() => expect(screen.getByRole('textbox')).toHaveClass('ProseMirror'))

	return screen.getByRole('textbox')
}

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

	it('waits for the end of an input method composition before the editor takes over', async () => {
		renderUI(<Notes />)

		focusAtEnd()

		const session = cdp()

		await session.send('Input.imeSetComposition', {
			text: 'にほ',
			selectionStart: 2,
			selectionEnd: 2,
		})

		gate.open()

		// The engine loads, and the render of the load commits. The editor waits
		// while the reader composes.
		await import('../../modules/wysiwyg/wysiwyg-editor')

		await pause(0)

		expect(screen.getByRole('textbox')).not.toHaveClass('ProseMirror')

		await session.send('Input.insertText', { text: '日本' })

		await waitFor(() => expect(screen.getByRole('textbox')).toHaveClass('ProseMirror'))

		expect(value()).toBe('日本')

		await userEvent.keyboard('語')

		expect(value()).toBe('日本語')
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
