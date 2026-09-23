/**
 * Pair each string with a React-key-safe identifier: the value itself for the
 * first occurrence, and a NUL-delimited key that names the occurrence index for
 * repeats. Lists with duplicates (controlled tag values, un-deduped validation
 * messages) collide on bare value keys.
 *
 * @remarks Every key is unique for any input. A value that holds a NUL never
 * passes through as its own key.
 */
export function keyByOccurrence(values: readonly string[]): { key: string; value: string }[] {
	const seen = new Map<string, number>()

	return values.map((value) => {
		const occurrence = seen.get(value) ?? 0

		seen.set(value, occurrence + 1)

		// A value passes through only when it holds no NUL. Every synthesised key
		// starts with NUL, so it cannot equal a value that passed through.
		const plain = occurrence === 0 && !value.includes('\u0000')

		return { key: plain ? value : `\u0000${occurrence}\u0000${value}`, value }
	})
}
