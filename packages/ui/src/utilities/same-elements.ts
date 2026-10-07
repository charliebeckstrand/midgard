/**
 * Whether two lists hold the same items in the same order, by reference.
 * `undefined` matches only `undefined`.
 */
export function sameElements<T>(a: readonly T[] | undefined, b: readonly T[] | undefined): boolean {
	if (a === b) return true

	if (a === undefined || b === undefined || a.length !== b.length) return false

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}

	return true
}
