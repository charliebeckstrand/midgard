// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { isComposing } from '../../utilities/is-composing'

const press = (isComposingFlag: boolean, keyCode: number) => ({
	keyCode,
	nativeEvent: { isComposing: isComposingFlag },
})

describe('isComposing', () => {
	it('is true while the event reports a composition', () => {
		expect(isComposing(press(true, 13))).toBe(true)
	})

	// The first key of a composition, and the Safari confirm Enter, report 229.
	it('is true for keyCode 229 without the composition flag', () => {
		expect(isComposing(press(false, 229))).toBe(true)
	})

	it('is false for a plain key press', () => {
		expect(isComposing(press(false, 13))).toBe(false)
	})

	it('reads the flag from a DOM keyboard event', () => {
		expect(isComposing({ keyCode: 13, isComposing: true })).toBe(true)

		expect(isComposing({ keyCode: 229, isComposing: false })).toBe(true)

		expect(isComposing({ keyCode: 13, isComposing: false })).toBe(false)
	})
})
