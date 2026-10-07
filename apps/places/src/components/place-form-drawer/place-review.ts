/**
 * The text of a review and the selection in it. `start` and `end` are the
 * offsets of the selection, and they are equal for a caret.
 */
export type ReviewEdit = {
	value: string
	start: number
	end: number
}

/** The Markdown marker of each inline format of the review toolbar. */
export const REVIEW_MARKERS = {
	bold: '**',
	italic: '_',
} as const

/** An inline format of the review toolbar. */
export type ReviewMarker = keyof typeof REVIEW_MARKERS

/**
 * Puts the marker of `format` on each side of the selection, or removes it when
 * it is there.
 *
 * The selection shrinks past its spaces first, because Markdown does not read
 * `** word **` as bold. A caret gets a pair of markers with the caret between
 * them, so the next text that the reader types has the format.
 *
 * @param edit - The text and the selection.
 * @param format - The format to put on or take off.
 * @returns The new text, with the selection on the same words.
 */
export function toggleMarker(edit: ReviewEdit, format: ReviewMarker): ReviewEdit {
	const marker = REVIEW_MARKERS[format]

	const size = marker.length

	const { value } = edit

	let { start, end } = edit

	while (start < end && /\s/.test(value.charAt(start))) start++

	while (end > start && /\s/.test(value.charAt(end - 1))) end--

	// The markers are outside the selection.
	if (value.slice(start - size, start) === marker && value.slice(end, end + size) === marker) {
		return {
			value: value.slice(0, start - size) + value.slice(start, end) + value.slice(end + size),
			start: start - size,
			end: end - size,
		}
	}

	const selected = value.slice(start, end)

	// The markers are the ends of the selection.
	if (selected.length >= size * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
		return {
			value: value.slice(0, start) + selected.slice(size, -size) + value.slice(end),
			start,
			end: end - size * 2,
		}
	}

	return {
		value: value.slice(0, start) + marker + selected + marker + value.slice(end),
		start: start + size,
		end: end + size,
	}
}

/** A list format of the review toolbar. */
export type ReviewList = 'bulleted' | 'numbered'

const LIST_PREFIX = /^(?:- |\d+\. )/

const PREFIX: Record<ReviewList, RegExp> = {
	bulleted: /^- /,
	numbered: /^\d+\. /,
}

/**
 * Makes each line of the selection an item of a list, or makes the lines text
 * again when each one is already an item of that kind.
 *
 * A line in the other kind of list changes to this kind, so a bulleted list
 * becomes a numbered list in one press. A numbered list counts from 1.
 *
 * @param edit - The text and the selection.
 * @param kind - The kind of list.
 * @returns The new text. A caret stays on its text, and a range selects the
 * lines.
 */
export function toggleList(edit: ReviewEdit, kind: ReviewList): ReviewEdit {
	const { value, start, end } = edit

	const from = value.lastIndexOf('\n', start - 1) + 1

	const next = value.indexOf('\n', end)

	const to = next === -1 ? value.length : next

	const lines = value.slice(from, to).split('\n')

	const remove = lines.every((line) => PREFIX[kind].test(line))

	const changed = lines.map((line, index) => {
		const text = line.replace(LIST_PREFIX, '')

		if (remove) return text

		return `${kind === 'bulleted' ? '- ' : `${index + 1}. `}${text}`
	})

	const block = changed.join('\n')

	const result = value.slice(0, from) + block + value.slice(to)

	if (start === end) {
		const caret = Math.max(from, start + (changed[0] ?? '').length - (lines[0] ?? '').length)

		return { value: result, start: caret, end: caret }
	}

	return { value: result, start: from, end: from + block.length }
}
