import type { ChatCitation } from '../chat-content/types'
import { keepQuoted } from './content'

/**
 * The rule that brings the citations of a draft back on an undo or a redo.
 *
 * The undo stack of a `<textarea>` holds text and nothing else. An undo of a
 * choice takes the text back, and the rebase dissolves the citation. A redo
 * then puts the text in again, and no change of the text makes a citation. So
 * the composer remembers the citations of each draft that it showed, by the
 * value of that draft. An undo or a redo that gives a value that the history
 * holds takes the citations of that value.
 *
 * The rule reads the history only on an undo or a redo. The browser says which
 * change is one: the `inputType` of its input event is `historyUndo` or
 * `historyRedo`. A reader who types a value again gets no citation back,
 * because no change of typed text makes a citation.
 */

/** The values that a history holds at most. The oldest value goes first. @internal */
export const DRAFT_HISTORY_LIMIT = 100

/** The citations of each draft that a composer showed, by its value. @internal */
export type DraftHistory = Map<string, readonly ChatCitation[]>

/**
 * Records the citations of the draft `value` in `history`. A value that the
 * history holds moves to the newest place, so the limit drops the value that
 * the reader saw longest ago.
 *
 * @internal
 */
export function rememberDraft(
	history: DraftHistory,
	value: string,
	citations: readonly ChatCitation[],
	limit = DRAFT_HISTORY_LIMIT,
): void {
	history.delete(value)

	history.set(value, citations)

	for (const oldest of history.keys()) {
		if (history.size <= limit) break

		history.delete(oldest)
	}
}

/**
 * Whether an input event is an undo or a redo of the browser.
 *
 * @internal
 * @param inputType - The `inputType` of the input event, which a browser with no support leaves out.
 */
export function isHistoryInput(inputType: string | undefined): boolean {
	return inputType === 'historyUndo' || inputType === 'historyRedo'
}

/**
 * The citations that the history holds for `value`, or `undefined` when it
 * holds none. Each citation is checked against its quote, as each reader of a
 * citation checks it.
 *
 * @internal
 */
export function recallDraft(
	history: DraftHistory,
	value: string,
): readonly ChatCitation[] | undefined {
	const citations = history.get(value)

	return citations === undefined ? undefined : keepQuoted(value, citations)
}
