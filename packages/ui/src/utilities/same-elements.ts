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

/** Whether two sets hold the same members, in any order. */
export function sameMembers<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
	if (a === b) return true

	if (a.size !== b.size) return false

	for (const member of a) if (!b.has(member)) return false

	return true
}

/**
 * Whether two plain objects hold the same own fields, each the same by
 * reference. A field set to `undefined` and a field that is absent differ.
 */
function sameFields(a: object, b: object | undefined): boolean {
	if (a === b) return true

	if (b === undefined) return false

	const keys = Object.keys(a)

	if (keys.length !== Object.keys(b).length) return false

	const left = a as Record<string, unknown>

	const right = b as Record<string, unknown>

	return keys.every((key) => Object.hasOwn(right, key) && left[key] === right[key])
}

/**
 * Whether two lists hold items with the same fields in the same order. Each
 * item is a plain object, and its fields compare by reference, one level deep.
 * A new list literal with the same entries thus matches the list before it.
 * `undefined` matches only `undefined`.
 */
export function sameFieldElements<T extends object>(
	a: readonly T[] | undefined,
	b: readonly T[] | undefined,
): boolean {
	if (a === b) return true

	if (a === undefined || b === undefined || a.length !== b.length) return false

	return a.every((item, index) => sameFields(item, b[index]))
}
