import { afterEach, describe, expect, it } from 'vitest'
import { __resetLastInput, lastInput } from '../../utilities/last-input'

afterEach(__resetLastInput)

describe('lastInput', () => {
	it('is null before the first input', () => {
		expect(lastInput()).toBeNull()
	})

	it('records the pointer type of a press, and a key press as keyboard', () => {
		document.body.dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }),
		)

		expect(lastInput()).toBe('touch')

		document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }))

		expect(lastInput()).toBe('keyboard')
	})

	it('records an input that a handler stops, because it listens in the capture phase', () => {
		const stop = (event: Event) => event.stopPropagation()

		document.body.addEventListener('pointerdown', stop)

		document.body.dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, pointerType: 'pen' }),
		)

		document.body.removeEventListener('pointerdown', stop)

		expect(lastInput()).toBe('pen')
	})
})
