/**
 * Count the "meaningful" characters in `s[0, end)` — those matching `keep`.
 * Used to anchor the caret to a typed character across a reformat that inserts
 * or removes separators.
 */
export function countMeaningful(s: string, end: number, keep: (char: string) => boolean) {
	const limit = Math.min(end, s.length)

	let count = 0

	for (let i = 0; i < limit; i++) if (keep(s.charAt(i))) count++

	return count
}

/**
 * Inverse of {@link countMeaningful}: the string offset just past the
 * `target`-th meaningful character, clamping to the string bounds.
 */
export function cursorForCount(s: string, target: number, keep: (char: string) => boolean) {
	if (target <= 0) return 0

	let count = 0

	for (let i = 0; i < s.length; i++) {
		if (keep(s.charAt(i))) {
			count++

			if (count === target) return i + 1
		}
	}

	return s.length
}
