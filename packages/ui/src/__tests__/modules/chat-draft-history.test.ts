// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { ChatCitation } from '../../modules/chat/engine/chat-content/types'
import {
	type DraftHistory,
	type DraftState,
	EMPTY_HISTORY,
	historyStep,
	recordDraft,
	stepDraft,
} from '../../modules/chat/engine/chat-draft/history'

const routes: ChatCitation = {
	id: 'c1',
	start: 4,
	end: 11,
	quote: '@Routes',
	target: 'dataset',
	selector: { dataset: 'routes' },
}

const CITED = 'Ask @Routes '

/** The history after each draft in turn, with the cursor at the last one. */
function record(...drafts: DraftState[]): DraftHistory {
	return drafts.reduce((history, draft) => recordDraft(history, draft), EMPTY_HISTORY)
}

/** Steps through `values` in order, as the browser gives them, and gives the citations of each step. */
function walk(history: DraftHistory, step: 'undo' | 'redo', values: string[]) {
	let current = history

	return values.map((value) => {
		const found = stepDraft(current, value, step)

		if (found) current = found.history

		return found?.citations
	})
}

describe('recordDraft', () => {
	it('records each new draft after the cursor', () => {
		const history = record({ value: 'a', citations: [] }, { value: 'ab', citations: [] })

		expect(history.drafts.map((d) => d.value)).toEqual(['a', 'ab'])

		expect(history.cursor).toBe(1)
	})

	it('changes nothing for the draft that shows', () => {
		const history = record({ value: CITED, citations: [routes] })

		expect(recordDraft(history, { value: CITED, citations: [{ ...routes }] })).toBe(history)
	})

	it('drops the drafts after the cursor, as a new change drops the redo steps', () => {
		const history = record({ value: 'a', citations: [] }, { value: 'ab', citations: [] })

		const back = stepDraft(history, 'a', 'undo')?.history ?? history

		const next = recordDraft(back, { value: 'ax', citations: [] })

		expect(next.drafts.map((d) => d.value)).toEqual(['a', 'ax'])
	})

	it('drops the oldest draft past the limit', () => {
		const history = ['a', 'b', 'c'].reduce(
			(h, value) => recordDraft(h, { value, citations: [] }, 2),
			EMPTY_HISTORY,
		)

		expect(history.drafts.map((d) => d.value)).toEqual(['b', 'c'])

		expect(history.cursor).toBe(1)
	})
})

describe('stepDraft', () => {
	it('brings a citation back on a redo of a choice', () => {
		const history = record(
			{ value: 'Ask @ro', citations: [] },
			{ value: CITED, citations: [routes] },
		)

		const [undone] = walk(history, 'undo', ['Ask @ro'])

		expect(undone).toEqual([])

		const back = stepDraft(history, 'Ask @ro', 'undo')?.history ?? history

		expect(stepDraft(back, CITED, 'redo')?.citations).toEqual([routes])
	})

	it('gives typed prose no citation on an undo, when the same value was a citation later', () => {
		// The reader typed the phrase as prose, cleared the draft, and then chose it.
		const history = record(
			{ value: CITED, citations: [] },
			{ value: '', citations: [] },
			{ value: 'Ask @ro', citations: [] },
			{ value: CITED, citations: [routes] },
		)

		expect(walk(history, 'undo', ['Ask @ro', '', CITED])).toEqual([[], [], []])
	})

	it('gives a choice its citation on an undo, when the same value was prose later', () => {
		// The reader chose the phrase, deleted it, and typed it again as prose.
		const history = record(
			{ value: CITED, citations: [routes] },
			{ value: 'Ask ', citations: [] },
			{ value: CITED, citations: [] },
		)

		expect(walk(history, 'undo', ['Ask ', CITED])).toEqual([[], [routes]])
	})

	it('gives nothing for a value that no draft in that direction holds', () => {
		const history = record({ value: 'a', citations: [] }, { value: 'ab', citations: [] })

		expect(stepDraft(history, 'ab', 'redo')).toBeUndefined()

		expect(stepDraft(history, 'zzz', 'undo')).toBeUndefined()
	})

	it('drops a citation whose quote is not at its address', () => {
		const history = record(
			{ value: 'Ask @Rout ', citations: [routes] },
			{ value: '', citations: [] },
		)

		expect(stepDraft(history, 'Ask @Rout ', 'undo')?.citations).toEqual([])
	})
})

describe('historyStep', () => {
	it('reads an undo and a redo of the browser', () => {
		expect(historyStep('historyUndo')).toBe('undo')

		expect(historyStep('historyRedo')).toBe('redo')
	})

	it.each(['insertText', 'deleteContentBackward', 'insertFromPaste', undefined])(
		'reads no step for %s',
		(inputType) => {
			expect(historyStep(inputType)).toBeUndefined()
		},
	)
})
