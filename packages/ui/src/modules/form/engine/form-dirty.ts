/** True for a `null`-proto or `Object.prototype` object, excluding class instances. @internal */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== 'object') return false

	const proto = Object.getPrototypeOf(value)

	return proto === null || proto === Object.prototype
}

/** Element-wise {@link valuesEqual} over two arrays. @internal */
function arraysEqual(a: unknown[], b: unknown[]): boolean {
	return a.length === b.length && a.every((item, i) => valuesEqual(item, b[i]))
}

/** Key-wise {@link valuesEqual} over two plain objects. @internal */
function plainObjectsEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
	const aKeys = Object.keys(a)
	const bKeys = Object.keys(b)

	return (
		aKeys.length === bKeys.length &&
		aKeys.every((key) => Object.hasOwn(b, key) && valuesEqual(a[key], b[key]))
	)
}

/**
 * Equality for the `dirty` derivation. Reference first, then structural over
 * `Date`, plain arrays, and plain objects; reference equality for `File`,
 * `Map`, `Set`, and class instances.
 *
 * @internal
 */
export function valuesEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true

	if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()

	if (Array.isArray(a) && Array.isArray(b)) return arraysEqual(a, b)

	if (isPlainObject(a) && isPlainObject(b)) return plainObjectsEqual(a, b)

	return false
}

/**
 * Gives the dirty flag of each field: `true` when the value of the field is not
 * equal to its default, by {@link valuesEqual}.
 *
 * @remarks The keys of `values` decide the fields, so a key that only the
 * defaults hold gets no flag.
 * @internal
 */
export function dirtyFields(
	values: Record<string, unknown>,
	defaults: Record<string, unknown>,
): Record<string, boolean> {
	const flags: Record<string, boolean> = {}

	for (const key in values) {
		flags[key] = !valuesEqual(values[key], defaults[key])
	}

	return flags
}
