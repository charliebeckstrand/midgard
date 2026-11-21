import type { ChatCitation } from '../chat-content/types'
import { keepQuoted } from './content'

/**
 * The rule that brings the citations of a draft back on an undo or a redo.
 *
 * The undo stack of a `<textarea>` holds text and nothing else. An undo of a
 * choice takes the text back, and the rebase dissolves the citation. A redo
 * then puts the text in again, and no change of the text makes a citation.
 *
 * So the composer keeps a stack of its own: each draft that it showed, in
 * order, and a cursor at the draft that shows now. An undo of the browser
 * goes back to an earlier draft, and a redo goes forward to a later one. The
 * rule finds that draft by its value, from the cursor and in the direction of
 * the step: the nearest earlier draft for an undo, and the nearest later draft
 * for a redo. A value can show more than once with other citations, such as a
 * phrase that the reader typed and later chose. The direction and the cursor
 * keep the two apart, where a lookup by value alone cannot.
 *
 * The rule reads the stack only on an undo or a redo. The browser says which
 * change is one: the `inputType` of its input event is `historyUndo` or
 * `historyRedo`. Any other change records a new draft after the cursor, and
 * the drafts after the cursor go, as the redo steps of the browser go.
 */

/** The drafts that a history holds at most. The oldest draft goes first. @internal */
export const DRAFT_HISTORY_LIMIT = 100

/** One draft that a composer showed: its text and the citations of that text. @internal */
export type DraftState = { value: string; citations: readonly ChatCitation[] }

/** The drafts that a composer showed, in order, and the index of the draft that shows now. @internal */
export type DraftHistory = { drafts: readonly DraftState[]; cursor: number }

/** A history that holds no draft. @internal */
export const EMPTY_HISTORY: DraftHistory = { drafts: [], cursor: -1 }

/** The direction of a step of the browser through its undo stack. @internal */
export type HistoryStep = 'undo' | 'redo'

/** Whether two drafts hold the same text and the same citations. @internal */
function sameDraft(a: DraftState, b: DraftState): boolean {
	if (a.value !== b.value || a.citations.length !== b.citations.length) return false

	return a.citations.every((citation, index) => {
		const other = b.citations[index]

		return (
			other !== undefined &&
			citation.id === other.id &&
			citation.start === other.start &&
			citation.end === other.end
		)
	})
}

/**
 * The history with `draft` recorded after the cursor. A draft that is the
 * draft at the cursor changes nothing. Each draft after the cursor goes, as
 * the redo steps of the browser go after a new change. Past the limit, the
 * oldest draft goes.
 *
 * @internal
 */
export function recordDraft(
	history: DraftHistory,
	draft: DraftState,
	limit = DRAFT_HISTORY_LIMIT,
): DraftHistory {
	const current = history.drafts[history.cursor]

	if (current && sameDraft(current, draft)) return history

	const drafts = [...history.drafts.slice(0, history.cursor + 1), draft].slice(-limit)

	return { drafts, cursor: drafts.length - 1 }
}

/**
 * The step of an input event through the undo stack of the browser, or
 * `undefined` for any other change.
 *
 * @internal
 * @param inputType - The `inputType` of the input event, which a browser with no support leaves out.
 */
export function historyStep(inputType: string | undefined): HistoryStep | undefined {
	if (inputType === 'historyUndo') return 'undo'

	if (inputType === 'historyRedo') return 'redo'

	return undefined
}

/**
 * The draft that a step of the browser goes to, and the history with the
 * cursor at it. The draft is the nearest one with `value` from the cursor, in
 * the direction of the step. Each citation is checked against its quote, as
 * each reader of a citation checks it. `undefined` when no draft in that
 * direction holds `value`, such as a draft that the limit dropped.
 *
 * @internal
 */
export function stepDraft(
	history: DraftHistory,
	value: string,
	step: HistoryStep,
): { history: DraftHistory; citations: readonly ChatCitation[] } | undefined {
	const { drafts, cursor } = history

	const by = step === 'undo' ? -1 : 1

	for (let index = cursor + by; index >= 0 && index < drafts.length; index += by) {
		const draft = drafts[index]

		if (draft?.value === value) {
			return { history: { drafts, cursor: index }, citations: keepQuoted(value, draft.citations) }
		}
	}

	return undefined
}
