/**
 * Pair each string with a React-key-safe identifier: the value itself for the
 * first occurrence, suffixed with its occurrence index for repeats. Lists with
 * duplicates (controlled tag values, un-deduped validation messages) collide
 * on bare value keys.
 */
export function keyByOccurrence(values: readonly string[]): { key: string; value: string }[] {
	const seen = new Map<string, number>()

	return values.map((value) => {
		const occurrence = seen.get(value) ?? 0

		seen.set(value, occurrence + 1)

		return { key: occurrence === 0 ? value : `${value}\u0000${occurrence}`, value }
	})
}
