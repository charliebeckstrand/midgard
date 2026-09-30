/** Element-wise reference equality between two arrays. @internal */
export function sameElements<T>(a: readonly T[], b: readonly T[]): boolean {
	if (a === b) return true

	if (a.length !== b.length) return false

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}

	return true
}

/** Whether two maps hold the same keys with the same numbers. @internal */
export function sameNumberMap<K>(a: ReadonlyMap<K, number>, b: ReadonlyMap<K, number>): boolean {
	if (a.size !== b.size) return false

	for (const [key, value] of a) {
		if (b.get(key) !== value) return false
	}

	return true
}
