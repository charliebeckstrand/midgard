// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { estimateTextFit } from '../../modules/chart/engine/chart-text-width'

/** Whether `text` holds a UTF-16 surrogate without its pair. */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

describe('estimateTextFit', () => {
	it('keeps the whole text when it fits', () => {
		expect(estimateTextFit('Direct', 1, 6)).toEqual({ text: 'Direct', width: 6 })
	})

	it('cuts a text that does not fit, with an ellipsis', () => {
		expect(estimateTextFit('Organic search', 1, 8).text).toBe('Organic…')
	})

	it('cuts before a character that two code units hold, not inside it', () => {
		// The room keeps three code units, and the third is the first half of the emoji.
		const { text } = estimateTextFit('ab😀cd', 1, 4)

		expect(text).not.toMatch(LONE_SURROGATE)

		expect(text).toBe('ab…')
	})

	it('cuts before a flag, not between its two letters', () => {
		// Each flag is two regional letters of two code units each. The room keeps
		// six code units: one flag and half of the next.
		expect(estimateTextFit('🇺🇸🇫🇷🇩🇪', 1, 7).text).toBe('🇺🇸…')
	})
})
