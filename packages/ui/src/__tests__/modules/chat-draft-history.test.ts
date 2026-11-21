// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { ChatCitation } from '../../modules/chat/engine/chat-content/types'
import {
	type DraftHistory,
	isHistoryInput,
	recallDraft,
	rememberDraft,
} from '../../modules/chat/engine/chat-draft/history'

const routes: ChatCitation = {
	id: 'c1',
	start: 4,
	end: 11,
	quote: '@Routes',
	target: 'dataset',
	selector: { dataset: 'routes' },
}

describe('rememberDraft and recallDraft', () => {
	it('recalls the citations of a value that the history holds', () => {
		const history: DraftHistory = new Map()

		rememberDraft(history, 'Ask @ro', [])

		rememberDraft(history, 'Ask @Routes ', [routes])

		expect(recallDraft(history, 'Ask @Routes ')).toEqual([routes])

		expect(recallDraft(history, 'Ask @ro')).toEqual([])
	})

	it('recalls nothing for a value that the history does not hold', () => {
		expect(recallDraft(new Map(), 'Ask @Routes ')).toBeUndefined()
	})

	it('drops a recalled citation whose quote is not at its address', () => {
		const history: DraftHistory = new Map([['Ask @Rout ', [routes]]])

		expect(recallDraft(history, 'Ask @Rout ')).toEqual([])
	})

	it('drops the value that the reader saw longest ago past the limit', () => {
		const history: DraftHistory = new Map()

		rememberDraft(history, 'a', [], 2)

		rememberDraft(history, 'b', [], 2)

		// `a` again: it is now the newest, so `b` is the oldest.
		rememberDraft(history, 'a', [], 2)

		rememberDraft(history, 'c', [], 2)

		expect([...history.keys()]).toEqual(['a', 'c'])
	})
})

describe('isHistoryInput', () => {
	it.each(['historyUndo', 'historyRedo'])('is true for %s', (inputType) => {
		expect(isHistoryInput(inputType)).toBe(true)
	})

	it.each(['insertText', 'deleteContentBackward', 'insertFromPaste', undefined])(
		'is false for %s',
		(inputType) => {
			expect(isHistoryInput(inputType)).toBe(false)
		},
	)
})
