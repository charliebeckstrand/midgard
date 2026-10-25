// A proper noun or a code of the demo data, such as "Mia Chen", "Acme Freight",
// or "ORD-7291", is the same in each language. `names` marks such a text, the
// way `words` marks a word that a translation changes. The page smoke test
// reads the names that it marked. A text that a translated page shows as the
// English page does fails the test, unless it is a name or comes from another
// recorded source (`__tests__/same-text.ts`).

/** Each text that {@link names} marked as a name. */
export const namedTexts = new Set<string>()

/**
 * Marks each text of `values` as a name, which stays the same in each
 * language, and gives `values` as it is.
 *
 * ```ts
 * const carriers = names(['Acme Freight', 'Northwind'])
 * ```
 *
 * @param values - The names, as a list or as an object of names by key.
 */
export function names<const Values extends readonly string[] | Readonly<Record<string, string>>>(
	values: Values,
): Values {
	for (const value of Object.values(values)) namedTexts.add(value)

	return values
}
