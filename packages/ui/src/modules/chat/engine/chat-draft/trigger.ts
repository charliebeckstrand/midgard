import type { ChatCitation } from '../chat-content/types'
import { rebaseCitations } from './rebase'

/**
 * The rules for a trigger in a draft: a character, such as `@` or `/`, that
 * opens a picker over a source. The reader types the trigger and a query, and
 * a choice puts a citation in place of the two.
 *
 * A trigger counts only at the start of the draft or after whitespace. Thus
 * an email address and a fraction such as `1/2` do not open a picker. A query
 * holds no whitespace, so a space after the query closes the picker.
 */

/** Where a trigger counts. @internal */
export type TriggerRule = {
	/** The character that opens the picker. */
	trigger: string
	/** `start` counts the trigger only at the start of the draft, after its leading whitespace. */
	at?: 'anywhere' | 'start'
}

/** A trigger that the caret is in. @internal */
export type TriggerMatch = {
	/** The index of the rule in the list that the caller gave. */
	index: number
	/** The offset of the trigger character. */
	start: number
	/** The text between the trigger and the caret. */
	query: string
}

/** Whether `char` is whitespace. @internal */
function isSpace(char: string | undefined): boolean {
	return char !== undefined && /\s/.test(char)
}

/**
 * The offset where the word of a trigger starts: the `anchor`, or the start of
 * the word that holds the caret. It is `-1` for an anchor with a line break
 * between it and the caret.
 *
 * @internal
 */
function queryStart(value: string, caret: number, anchor: number | undefined): number {
	if (anchor !== undefined) return value.slice(anchor, caret).includes('\n') ? -1 : anchor

	let start = caret - 1

	while (start >= 0 && !isSpace(value[start])) start--

	// The word that holds the caret starts after the whitespace.
	return start + 1
}

/**
 * The trigger that the caret is in, or `null`. The caret is in a trigger when
 * the text from the trigger to the caret holds no whitespace, and the trigger
 * counts at its place.
 *
 * A trigger in a citation does not count. The citation is already a choice, so
 * a caret at its end does not open a second picker.
 *
 * An `anchor` sets the offset of the trigger, and the query can then hold
 * spaces, but not a line break. Thus a citation that a Backspace dissolves
 * opens its picker again with all of its label, such as `Late stop`.
 *
 * @internal
 * @param caret - The offset of a collapsed selection.
 * @param anchor - The offset of a trigger that the query starts at, in place of the word that holds the caret.
 */
export function activeTrigger(
	value: string,
	caret: number,
	rules: readonly TriggerRule[],
	citations: readonly ChatCitation[] = [],
	anchor?: number,
): TriggerMatch | null {
	const start = queryStart(value, caret, anchor)

	if (start < 0 || start >= caret) return null

	if (citations.some((citation) => citation.start < caret && citation.end > start)) return null

	const leading = value.length - value.trimStart().length

	for (const [index, rule] of rules.entries()) {
		if (!value.startsWith(rule.trigger, start)) continue

		if (rule.at === 'start' && start !== leading) continue

		return { index, start, query: value.slice(start + rule.trigger.length, caret) }
	}

	return null
}

/** What a choice gives: the next draft and the caret after the citation. @internal */
export type TriggerChoice = {
	/** The text that goes in place of the word of the trigger. */
	text: string
	/** The end of the word that the text replaces. The word starts at the trigger. */
	tail: number
	value: string
	citations: readonly ChatCitation[]
	caret: number
}

/**
 * The draft after a choice in the picker of `match`. The word of the trigger
 * becomes the quote of the citation, which is the trigger and the label of the
 * choice. The word ends at the next whitespace, so a choice with the caret in
 * a word replaces all of the word. A space follows the quote unless whitespace
 * already does, and the caret goes after that space.
 *
 * @internal
 * @param citation - The new citation, with no address yet. The rule gives it its offsets and its quote.
 */
export function chooseInTrigger(
	value: string,
	citations: readonly ChatCitation[],
	match: TriggerMatch,
	trigger: string,
	label: string,
	citation: Omit<ChatCitation, 'start' | 'end' | 'quote'>,
): TriggerChoice {
	const quote = `${trigger}${label}`

	// The caret is at the end of the query.
	let tail = match.start + trigger.length + match.query.length

	while (tail < value.length && !isSpace(value[tail])) tail++

	const text = isSpace(value[tail]) ? quote : `${quote} `

	const next = value.slice(0, match.start) + text + value.slice(tail)

	const end = match.start + quote.length

	const chosen: ChatCitation = { ...citation, start: match.start, end, quote }

	const kept = rebaseCitations(value, next, citations, match.start + text.length)

	return {
		text,
		tail,
		value: next,
		citations: [...kept, chosen].sort((a, b) => a.start - b.start),
		caret: end + 1,
	}
}
