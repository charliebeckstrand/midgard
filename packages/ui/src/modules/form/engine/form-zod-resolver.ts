import type { Validators } from './types'

/** A single validation issue in the Zod `safeParse` shape: a `path` whose head names the field and a human-readable `message`. */
export type ZodIssue = { path: ReadonlyArray<PropertyKey>; message: string }

/** The minimal `safeParse` return this resolver reads: a success flag, and on failure an `error.issues` list of {@link ZodIssue}. */
export type ZodParseResult =
	| { success: true }
	| { success: false; error: { issues: ReadonlyArray<ZodIssue> } }

/** Structural minimum a schema must satisfy to be used here: a `safeParse` returning a {@link ZodParseResult}. Zod, Valibot, ArkType, or a hand-rolled object all qualify. */
export type ZodLike = { safeParse: (input: unknown) => ZodParseResult }

/**
 * Groups issues by `path[0]`, preserving schema order, de-duplicating messages,
 * and dropping form-level issues (`path: []`).
 *
 * @internal
 */
function bucketIssues(issues: ReadonlyArray<ZodIssue>): Record<string, string[] | undefined> {
	const buckets: Record<string, string[] | undefined> = {}

	for (const issue of issues) {
		const head = issue.path[0]

		if (head === undefined) continue

		const key = String(head)

		const bucket = buckets[key]

		if (bucket) {
			if (!bucket.includes(issue.message)) bucket.push(issue.message)
		} else buckets[key] = [issue.message]
	}

	return buckets
}

/**
 * Changes a schema in the shape of Zod into the `Validators<T>` map that `Form`
 * reads. The schema needs only a `safeParse` method. The resolver does not
 * import `zod`, so a Valibot, an ArkType, or a hand-written schema of the same
 * shape also works.
 *
 * @param schema - A {@link ZodLike} schema that validates the whole value record.
 * @param defaultValues - The defaults of the form. Their keys tell which field
 * validators the resolver makes.
 * @returns A `Validators<T>` map with one validator for each field, for the
 * `validate` prop of `Form`.
 * @typeParam T - The shape of the value record.
 * @remarks The resolver parses the whole schema once for each `values` object,
 * and keeps the result. The field validators of one reducer pass thus share
 * one parse, and so does a refinement across fields. A field gets each issue
 * whose `path[0]` is the field, in the order of the schema, and the same
 * message only once. An issue of the whole form (`path: []`) is dropped. To
 * show it, attach it to a field with `.refine(..., { path: ['…'] })`.
 */
export function zodResolver<T extends Record<string, unknown>>(
	schema: ZodLike,
	defaultValues: T,
): Validators<T> {
	let cachedValues: T | undefined
	let cachedErrors: Record<string, string[] | undefined> = {}

	function errorsFor(values: T): Record<string, string[] | undefined> {
		if (cachedValues === values) return cachedErrors

		const result = schema.safeParse(values)

		const errors = result.success ? {} : bucketIssues(result.error.issues)

		cachedValues = values
		cachedErrors = errors

		return errors
	}

	const validators = {} as Validators<T>

	for (const key of Object.keys(defaultValues) as Array<keyof T>) {
		validators[key] = ((_value, values) => errorsFor(values)[String(key)]) as Validators<T>[keyof T]
	}

	return validators
}
