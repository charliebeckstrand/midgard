// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { canSubmitDraft, draftContent } from '../../modules/chat/engine/chat-draft'

describe('draftContent', () => {
	it.for<[string, string, string]>([
		['drops the whitespace around the value', '  hello  ', 'hello'],
		['keeps the whitespace inside the value', ' two words\nand a line ', 'two words\nand a line'],
		['is empty for an empty draft', '', ''],
		['is empty for whitespace alone, including tabs and newlines', '   ', ''],
		['is empty for whitespace alone, including tabs and newlines', '\t\n ', ''],
	])('%s (%j)', ([, draft, content]) => {
		expect(draftContent(draft)).toBe(content)
	})
})

describe('canSubmitDraft', () => {
	it.each(['', '   '])('is false for the draft %j', (draft) => {
		expect(canSubmitDraft(draft)).toBe(false)
	})

	it('is true once the draft holds a character', () => {
		expect(canSubmitDraft('hi')).toBe(true)

		expect(canSubmitDraft('  hi  ')).toBe(true)
	})
})
