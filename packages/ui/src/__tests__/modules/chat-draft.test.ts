import { describe, expect, it } from 'vitest'
import { canSubmitDraft, draftContent } from '../../modules/chat/engine/chat-draft'

describe('draftContent', () => {
	it('drops the whitespace around the value', () => {
		expect(draftContent('  hello  ')).toBe('hello')
	})

	it('keeps the whitespace inside the value', () => {
		expect(draftContent(' two words\nand a line ')).toBe('two words\nand a line')
	})

	it('is empty for an empty draft', () => {
		expect(draftContent('')).toBe('')
	})

	it('is empty for whitespace alone, including tabs and newlines', () => {
		expect(draftContent('   ')).toBe('')

		expect(draftContent('\t\n ')).toBe('')
	})
})

describe('canSubmitDraft', () => {
	it('is false for an empty draft', () => {
		expect(canSubmitDraft('')).toBe(false)
	})

	it('is false for whitespace alone', () => {
		expect(canSubmitDraft('   ')).toBe(false)
	})

	it('is true once the draft holds a character', () => {
		expect(canSubmitDraft('hi')).toBe(true)

		expect(canSubmitDraft('  hi  ')).toBe(true)
	})
})
