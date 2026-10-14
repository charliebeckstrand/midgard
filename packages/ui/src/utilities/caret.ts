/**
 * Count the "meaningful" characters in `text[0, end)`: those matching `keep`.
 * Anchors the caret to a typed character across a reformat that inserts or
 * removes separators. `keep` gets each character, its index, and `text`, so a
 * predicate can count a character only at the position where the format
 * keeps it.
 */
export function countMeaningful(
	text: string,
	end: number,
	keep: (char: string, index: number, text: string) => boolean,
) {
	const limit = Math.min(end, text.length)

	let count = 0

	for (let i = 0; i < limit; i++) if (keep(text.charAt(i), i, text)) count++

	return count
}

/**
 * Inverse of {@link countMeaningful}: the string offset one past the
 * `target`-th meaningful character, clamping to the string bounds. `keep` gets
 * each character, its index, and `text`.
 */
export function cursorForCount(
	text: string,
	target: number,
	keep: (char: string, index: number, text: string) => boolean,
) {
	if (target <= 0) return 0

	let count = 0

	for (let i = 0; i < text.length; i++) {
		if (keep(text.charAt(i), i, text)) {
			count++

			if (count === target) return i + 1
		}
	}

	return text.length
}

/**
 * A `keep` predicate for a mask that keeps only digits. It counts a decimal
 * digit in the Basic Multilingual Plane, because the card masks change such a
 * digit to its ASCII digit. A letter that the mask removes then does not move
 * the caret.
 *
 * @remarks The predicate gets one UTF-16 code unit, so a surrogate never
 * matches. Thus it counts only digits in the Basic Multilingual Plane. The
 * card masks remove a digit outside that plane, such as a mathematical digit.
 * @internal
 */
export function isDecimalDigit(char: string) {
	return /\p{Nd}/u.test(char)
}
