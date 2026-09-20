/**
 * Adapts a corpus array for `it.each`, pairing each entry's name with the entry
 * itself.
 *
 * @remarks
 * A gate reads `('%s …', (_name, { element }) => …)`. Passing the objects
 * straight to `it.each` would work through `$name`, but Vitest quotes an
 * interpolated string, so every swept test would be renamed. This keeps the
 * names the corpus has always printed.
 */
export function rows<T extends { name: string }>(
	entries: readonly T[],
): readonly (readonly [string, T])[] {
	return entries.map((entry) => [entry.name, entry] as const)
}
