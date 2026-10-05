/**
 * Count the "meaningful" characters in `s[0, end)`: those matching `keep`.
 * Anchors the caret to a typed character across a reformat that inserts or
 * removes separators. `keep` gets each character, its index, and `s`, so a
 * predicate can count a character only at the position where the format
 * keeps it.
 */
export function countMeaningful(
	s: string,
	end: number,
	keep: (char: string, index: number, text: string) => boolean,
) {
	const limit = Math.min(end, s.length)

	let count = 0

	for (let i = 0; i < limit; i++) if (keep(s.charAt(i), i, s)) count++

	return count
}

/**
 * Inverse of {@link countMeaningful}: the string offset one past the
 * `target`-th meaningful character, clamping to the string bounds. `keep` gets
 * each character, its index, and `s`.
 */
export function cursorForCount(
	s: string,
	target: number,
	keep: (char: string, index: number, text: string) => boolean,
) {
	if (target <= 0) return 0

	let count = 0

	for (let i = 0; i < s.length; i++) {
		if (keep(s.charAt(i), i, s)) {
			count++

			if (count === target) return i + 1
		}
	}

	return s.length
}

/**
 * A `keep` predicate for a mask that keeps only ASCII digits. A letter that
 * the mask removes then does not move the caret.
 *
 * @internal
 */
export function isAsciiDigit(char: string) {
	return char >= '0' && char <= '9'
}
