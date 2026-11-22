import { FORM_RULE, type WithFormRule } from './form-validate'
import type { Validators } from './types'

/** A single validation issue in the Zod `safeParse` shape: a `path` whose head names the field and a human-readable `message`. */
export type ZodIssue = { path: ReadonlyArray<PropertyKey>; message: string }

/** The minimal `safeParse` return this resolver reads: a success flag, and on failure an `error.issues` list of {@link ZodIssue}. */
export type ZodParseResult =
	| { success: true }
	| { success: false; error: { issues: ReadonlyArray<ZodIssue> } }

/** Structural minimum a schema must satisfy to be used here: a `safeParse` returning a {@link ZodParseResult}. Zod, Valibot, ArkType, or a hand-rolled object all qualify. */
export type ZodLike = { safeParse: (input: unknown) => ZodParseResult }

/** The issues of one parse: the issues of each field, and the first issue of the whole form. @internal */
type ParsedIssues = { fields: Record<string, string[] | undefined>; form: string | undefined }

/**
 * Groups issues by `path[0]`, preserving schema order and de-duplicating
 * messages. The first issue with no field (`path: []`) is the issue of the
 * whole form.
 *
 * @internal
 */
function bucketIssues(issues: ReadonlyArray<ZodIssue>): ParsedIssues {
	const buckets: Record<string, string[] | undefined> = {}

	let form: string | undefined

	for (const issue of issues) {
		const head = issue.path[0]

		if (head === undefined) {
			form ??= issue.message

			continue
		}

		const key = String(head)

		const bucket = buckets[key]

		if (bucket) {
			if (!bucket.includes(issue.message)) bucket.push(issue.message)
		} else buckets[key] = [issue.message]
	}

	return { fields: buckets, form }
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
 * message only once. The first issue of the whole form (`path: []`) is the
 * issue of the form. A submit refuses on it, and `FormError` and
 * `FormErrorSummary` show it. Only a submit runs it, so it does not show
 * while the reader types. To show an issue at a field as the reader types,
 * attach it to the field with `.refine(..., { path: ['…'] })`.
 */
export function zodResolver<T extends Record<string, unknown>>(
	schema: ZodLike,
	defaultValues: T,
): Validators<T> {
	let cachedValues: T | undefined
	let cachedIssues: ParsedIssues = { fields: {}, form: undefined }

	function issuesFor(values: T): ParsedIssues {
		if (cachedValues === values) return cachedIssues

		const result = schema.safeParse(values)

		const issues = result.success
			? { fields: {}, form: undefined }
			: bucketIssues(result.error.issues)

		cachedValues = values
		cachedIssues = issues

		return issues
	}

	const validators = {} as Validators<T>

	for (const key of Object.keys(defaultValues) as Array<keyof T>) {
		validators[key] = ((_value, values) =>
			issuesFor(values).fields[String(key)]) as Validators<T>[keyof T]
	}

	const withRule: WithFormRule<T> = validators

	withRule[FORM_RULE] = (values) => issuesFor(values).form

	return withRule
}
