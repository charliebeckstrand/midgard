import type { Validators } from './form-reducer'

export type ZodIssue = { path: ReadonlyArray<PropertyKey>; message: string }

export type ZodParseResult =
	| { success: true }
	| { success: false; error: { issues: ReadonlyArray<ZodIssue> } }

export type ZodLike = { safeParse: (input: unknown) => ZodParseResult }

/**
 * Adapt a Zod-shaped schema (anything exposing `safeParse`) to the
 * `Validators<T>` map that `<Form>` consumes. The library takes no dependency
 * on `zod` itself — Valibot, ArkType, or a hand-rolled schema with the same
 * shape all plug in.
 *
 * Parses the whole schema once per `values` identity and caches the result, so
 * per-field calls inside one reducer pass don't re-parse. Cross-field
 * refinements work because every field reads from the same memoized parse.
 *
 * Every issue at `path[0] === <field>` is collected, preserving schema order
 * and de-duplicating identical messages. Form-level issues (`path: []`) are
 * dropped — attach them to a real field via `.refine(..., { path: ['…'] })`.
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

		const next: Record<string, string[] | undefined> = {}

		if (!result.success) {
			for (const issue of result.error.issues) {
				const head = issue.path[0]

				if (head === undefined) continue

				const key = String(head)

				const bucket = next[key]

				if (bucket) {
					if (!bucket.includes(issue.message)) bucket.push(issue.message)
				} else next[key] = [issue.message]
			}
		}

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
