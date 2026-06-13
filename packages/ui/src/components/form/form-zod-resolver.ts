import type { Validators } from './form-reducer'

/** A single validation issue in the Zod `safeParse` shape: a `path` whose head names the field and a human-readable `message`. */
export type ZodIssue = { path: ReadonlyArray<PropertyKey>; message: string }

/** The minimal `safeParse` return this resolver reads: a success flag, and on failure an `error.issues` list of {@link ZodIssue}. */
export type ZodParseResult =
	| { success: true }
	| { success: false; error: { issues: ReadonlyArray<ZodIssue> } }

/** Structural minimum a schema must satisfy to be used here: a `safeParse` returning a {@link ZodParseResult}. Zod, Valibot, ArkType, or a hand-rolled object all qualify. */
export type ZodLike = { safeParse: (input: unknown) => ZodParseResult }

/**
 * Adapts a Zod-shaped schema (anything exposing `safeParse`) into the
 * `Validators<T>` map that {@link Form} consumes. Takes no dependency on `zod`
 * itself, so Valibot, ArkType, or a hand-rolled schema with the same shape all
 * plug in.
 *
 * @param schema - A {@link ZodLike} schema validating the whole value record.
 * @param defaultValues - The form's defaults; their keys determine which
 * per-field validators are generated.
 * @returns A `Validators<T>` map with one validator per field, suitable for
 * `Form`'s `validate` prop.
 * @typeParam T - The form-value record shape.
 * @remarks Parses the whole schema once per `values` identity and caches the
 * result, so per-field calls within one reducer pass — and any cross-field
 * refinements — share the same memoized parse. Collects every issue at
 * `path[0] === <field>`, preserving schema order and de-duplicating identical
 * messages. Drops form-level issues (`path: []`); attach them to a real field
 * via `.refine(..., { path: ['…'] })`.
 */
// Groups issues by `path[0]`, preserving schema order, de-duplicating
// messages, and dropping form-level issues (`path: []`).
function bucketZodIssues(issues: ReadonlyArray<ZodIssue>): Record<string, string[] | undefined> {
	const next: Record<string, string[] | undefined> = {}

	for (const issue of issues) {
		const head = issue.path[0]

		if (head === undefined) continue

		const key = String(head)

		const bucket = next[key]

		if (bucket) {
			if (!bucket.includes(issue.message)) bucket.push(issue.message)
		} else next[key] = [issue.message]
	}

	return next
}

export function zodResolver<T extends Record<string, unknown>>(
	schema: ZodLike,
	defaultValues: T,
): Validators<T> {
	let cachedValues: T | undefined
	let cachedErrors: Record<string, string[] | undefined> = {}

	function errorsFor(values: T): Record<string, string[] | undefined> {
		if (cachedValues === values) return cachedErrors

		const result = schema.safeParse(values)

		const next = result.success ? {} : bucketZodIssues(result.error.issues)

		cachedValues = values
		cachedErrors = next

		return next
	}

	const validators = {} as Validators<T>

	for (const key of Object.keys(defaultValues) as Array<keyof T>) {
		validators[key] = ((_value, values) => errorsFor(values)[String(key)]) as Validators<T>[keyof T]
	}

	return validators
}
