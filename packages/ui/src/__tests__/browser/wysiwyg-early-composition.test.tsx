import { describe, expect, it } from 'vitest'
import { cdp, userEvent } from 'vitest/browser'
import { renderUI, screen, waitFor } from '../helpers'
import { pause } from './helpers/wall-clock'
import {
	focusAtEnd,
	holdEditorLoad,
	load,
	Notes,
	release,
	value,
} from './helpers/wysiwyg-early-input'

/**
 * An input method composition in a Wysiwyg before its editor loads. The field
 * holds the load of the editor until the composition ends, and then the editor
 * takes the composed text.
 *
 * Each case starts the composition through the CDP of Chromium
 * (`Input.imeSetComposition`). Playwright has no other way to drive an input
 * method, so the WebKit instance (`wysiwyg-webkit`) does not run this file.
 */
holdEditorLoad()

describe('Wysiwyg composition before the editor loads (real browser)', () => {
	it('waits for the end of an input method composition before the editor takes over', async () => {
		renderUI(<Notes />)

		focusAtEnd()

		const session = cdp()

		await session.send('Input.imeSetComposition', {
			text: 'にほ',
			selectionStart: 2,
			selectionEnd: 2,
		})

		release()

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

	it('types the text of a composition after a held key', async () => {
		renderUI(<Notes />)

		focusAtEnd()

		await userEvent.keyboard('a{ControlOrMeta>}b{/ControlOrMeta}')

		const session = cdp()

		await session.send('Input.imeSetComposition', {
			text: 'にほ',
			selectionStart: 2,
			selectionEnd: 2,
		})

		await session.send('Input.insertText', { text: '日本' })

		await load()

		await waitFor(() => expect(value()).toBe('a**日本**'))
	})

	it('holds a toolbar press in a composition, and takes the composed text', async () => {
		renderUI(<Notes toolbar />)

		focusAtEnd()

		const session = cdp()

		await session.send('Input.imeSetComposition', {
			text: 'にほ',
			selectionStart: 2,
			selectionEnd: 2,
		})

		screen.getByRole('button', { name: 'Bold' }).click()

		await session.send('Input.insertText', { text: '日本' })

		await load()

		await waitFor(() => expect(value()).toBe('日本'))

		await userEvent.keyboard('x')

		expect(value()).toBe('日本**x**')
	})
})
