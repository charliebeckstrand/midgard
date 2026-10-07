/** Whether two maps hold the same keys with the same numbers. @internal */
export function sameNumberMap<K>(a: ReadonlyMap<K, number>, b: ReadonlyMap<K, number>): boolean {
	if (a.size !== b.size) return false

	for (const [key, value] of a) {
		if (b.get(key) !== value) return false
	}

	return true
}
