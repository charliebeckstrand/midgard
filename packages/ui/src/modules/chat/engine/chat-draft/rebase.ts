import type { ChatCitation } from '../chat-content/types'
import { keepQuoted } from './content'

/**
 * The rule that holds the citations of a draft across one change of its text.
 *
 * A composer is a plain `<textarea>`, so each change reaches the draft as a
 * new value and nothing more. Typing, deletion, paste, cut, autocorrect, an
 * undo, and the end of an IME composition are all one change of the value.
 * The rule finds the one region that the change replaced, and moves each
 * citation by it:
 *
 * - A citation that ends at or before the region stays where it is.
 * - A citation that starts at or after the region moves by the change in length.
 * - A citation that the region touches dissolves, and its text stays as prose.
 *
 * A citation is constructed and not parsed, so no change of the text makes
 * one. A pasted `@name` is prose.
 */

/** The region that one change replaced: `[start, end)` in the old value, `[start, nextEnd)` in the new one. @internal */
export type DraftEdit = { start: number; end: number; nextEnd: number }

/**
 * The length of the start that `a` and `b` share, up to `limit`.
 *
 * @internal
 */
function sharedStart(a: string, b: string, limit: number): number {
	let length = 0

	while (length < limit && a.charCodeAt(length) === b.charCodeAt(length)) length++

	return length
}

/**
 * The length of the end that `a` and `b` share, up to `limit`.
 *
 * @internal
 */
function sharedEnd(a: string, b: string, limit: number): number {
	let length = 0

	while (
		length < limit &&
		a.charCodeAt(a.length - 1 - length) === b.charCodeAt(b.length - 1 - length)
	) {
		length++
	}

	return length
}

/**
 * The region that a change from `prev` to `next` replaced.
 *
 * The two values alone do not always say where a change is. Type `a` inside
 * `@Qa` and the value is `@Qaa`, the same value as an `a` typed after it. The
 * caret says which: after an edit, the caret is at the end of the text that the
 * edit put in. With a caret, the region ends there, so an edit inside a
 * citation dissolves it. A caret that cannot end the edit, such as one that a
 * change by code left behind, is not read.
 *
 * With no caret, the region is the longest shared start and the longest shared
 * end that do not cross.
 *
 * @internal
 * @param caret - The `selectionEnd` of the field after the change, if the field gave the change.
 */
export function draftEdit(prev: string, next: string, caret?: number): DraftEdit {
	const shortest = Math.min(prev.length, next.length)

	const start = sharedStart(prev, next, shortest)

	const end = sharedEnd(prev, next, shortest - start)

	if (caret !== undefined && caret >= 0 && caret <= next.length) {
		const after = next.length - caret

		// The text after the caret must be text that the change kept.
		if (after <= sharedEnd(prev, next, shortest)) {
			const prevEnd = prev.length - after

			const editStart = Math.min(start, caret, prevEnd)

			return { start: editStart, end: prevEnd, nextEnd: caret }
		}
	}

	return { start, end: prev.length - end, nextEnd: next.length - end }
}

/**
 * The citations of a draft after its text changed from `prev` to `next`. The
 * result is the same array when no citation moves, so a memo that reads it
 * holds.
 *
 * Each citation that the rule keeps is also checked against its quote. That is
 * the guard that each reader of a citation applies, so a draft holds no
 * citation that cannot draw.
 *
 * @internal
 * @param caret - The `selectionEnd` of the field after the change. See {@link draftEdit}.
 */
export function rebaseCitations(
	prev: string,
	next: string,
	citations: readonly ChatCitation[],
	caret?: number,
): readonly ChatCitation[] {
	if (citations.length === 0 || prev === next) return citations

	const edit = draftEdit(prev, next, caret)

	const shift = edit.nextEnd - edit.end

	let moved = false

	const rebased = citations.flatMap((citation) => {
		if (citation.end <= edit.start) return [citation]

		// An insertion at the start of a citation is before it, so it moves the citation.
		if (citation.start >= edit.end) {
			if (shift === 0) return [citation]

			moved = true

			return [{ ...citation, start: citation.start + shift, end: citation.end + shift }]
		}

		moved = true

		return []
	})

	return moved ? keepQuoted(next, rebased) : citations
}
