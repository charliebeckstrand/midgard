// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createPressOwner, isPrimaryPress } from '../../utilities/primary-press'

const press = { isPrimary: true, button: 0, ctrlKey: false }

describe('isPrimaryPress', () => {
	it('accepts a plain primary press', () => {
		expect(isPrimaryPress(press)).toBe(true)
	})

	// A mouse event has no `isPrimary`. The browser sends it only for the primary pointer.
	it('accepts a plain mouse press, which carries no isPrimary', () => {
		expect(isPrimaryPress({ button: 0, ctrlKey: false })).toBe(true)
	})

	it('refuses a mouse Ctrl-click', () => {
		expect(isPrimaryPress({ button: 0, ctrlKey: true })).toBe(false)
	})

	// On macOS a Ctrl-click is the secondary click. It sends button 0 with ctrlKey.
	it.each([
		['a Ctrl-click', { ctrlKey: true }],
		['a secondary button', { button: 2 }],
		['a middle button', { button: 1 }],
		['a pointer that is not primary', { isPrimary: false }],
	])('refuses %s', (_, change) => {
		expect(isPrimaryPress({ ...press, ...change })).toBe(false)
	})
})

describe('createPressOwner', () => {
	const pen = { ...press, pointerId: 1, pointerType: 'pen' }

	// Each pointer type has its own primary pointer, so a palm is primary while a pen draws.
	const palm = { ...press, pointerId: 2, pointerType: 'touch' }

	it('takes a primary press and owns only its pointer', () => {
		const owner = createPressOwner()

		expect(owner.claim(pen)).toBe(true)

		expect(owner.held()).toBe(true)

		expect(owner.owns(pen)).toBe(true)

		expect(owner.owns(palm)).toBe(false)
	})

	it('refuses a second primary press while a pointer holds the gesture', () => {
		const owner = createPressOwner()

		owner.claim(pen)

		expect(owner.claim(palm)).toBe(false)

		expect(owner.owns(pen)).toBe(true)
	})

	it('takes a new press after the release', () => {
		const owner = createPressOwner()

		owner.claim(pen)

		owner.release()

		expect(owner.held()).toBe(false)

		expect(owner.owns(pen)).toBe(false)

		expect(owner.claim(palm)).toBe(true)
	})

	it('refuses a press that isPrimaryPress refuses', () => {
		expect(createPressOwner().claim({ ...pen, button: 2 })).toBe(false)
	})

	it('holds the gesture for a mouse event, which has no pointerId', () => {
		const owner = createPressOwner()

		expect(owner.claim({ button: 0, ctrlKey: false })).toBe(true)

		expect(owner.claim(palm)).toBe(false)
	})
})
