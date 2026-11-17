// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { estimateTextFit, estimateTextWrap } from '../../modules/chart/engine/chart-text-width'

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

describe('estimateTextWrap', () => {
	it('breaks a text at its spaces, with as many words on each line as fit', () => {
		expect(estimateTextWrap('Net revenue by region', 11, 3)).toEqual(['Net revenue', 'by region'])
	})

	it('keeps a text that fits on one line', () => {
		expect(estimateTextWrap('Direct', 10, 3)).toEqual(['Direct'])
	})

	it('cuts the rest of a long text on its last line, with an ellipsis', () => {
		const lines = estimateTextWrap('one two three four five six', 9, 2)

		expect(lines).toEqual(['one two', 'three fo…'])

		expect(lines?.every((line) => line.length <= 9)).toBe(true)
	})

	it('keeps the words that a no-break space joins on one line', () => {
		// ICU writes a narrow no-break space (U+202F) before the day period.
		expect(estimateTextWrap('Opens 10:00\u202FAM', 9, 3)).toEqual(['Opens', '10:00\u202FAM'])
	})

	it('gives no lines when one word is longer than a line', () => {
		expect(estimateTextWrap('Supercalifragilistic sales', 10, 3)).toBeNull()
	})
})
