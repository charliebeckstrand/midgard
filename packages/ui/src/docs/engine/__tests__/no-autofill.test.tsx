import { describe, expect, it } from 'vitest'
import { NO_AUTOFILL_ATTRIBUTES, noAutofill } from '../no-autofill'

function expectQuiet(field: Element) {
	for (const [name, value] of Object.entries(NO_AUTOFILL_ATTRIBUTES)) {
		expect(field).toHaveAttribute(name, value)
	}
}

// The observer delivers its records in a microtask after the change.
const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve))

function setup(html: string) {
	const root = document.createElement('div')

	root.innerHTML = html

	return { root, stop: noAutofill(root) }
}

describe('noAutofill', () => {
	it('quiets each text field, and leaves a checkbox alone', () => {
		const { root, stop } = setup('<input autocomplete="name"><input type="checkbox">')

		const [text, checkbox] = root.querySelectorAll('input')

		expectQuiet(text as Element)

		expect(checkbox).not.toHaveAttribute('autocomplete')

		stop()
	})

	it('quiets a field that mounts later', async () => {
		const { root, stop } = setup('')

		root.append(document.createElement('textarea'))

		await flush()

		expectQuiet(root.querySelector('textarea') as Element)

		stop()
	})

	it('restores an attribute that a prop writes over', async () => {
		const { root, stop } = setup('<input>')

		const field = root.querySelector('input') as HTMLInputElement

		field.setAttribute('autocomplete', 'postal-code')

		await flush()

		expectQuiet(field)

		stop()
	})

	it('quiets a field that a new type makes a text field', async () => {
		const { root, stop } = setup('<input type="checkbox">')

		const field = root.querySelector('input') as HTMLInputElement

		field.type = 'text'

		await flush()

		expectQuiet(field)

		stop()
	})
})
