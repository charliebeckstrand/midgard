/** Per-field issue map: field key to its issue list, or `undefined` when the field is clean. */
export type Errors = Record<string, string[] | undefined>

/** Per-field touched map: field key to whether the user has blurred it. */
export type Touched = Record<string, boolean>

/**
 * Validates one field against its value and the whole record. It returns an
 * issue (or issues), or `undefined` when the value is valid.
 *
 * @internal
 */
export type Validator<T, K extends keyof T> = (
	value: T[K],
	values: T,
) => string | string[] | undefined

/** Optional {@link Validator} per field of `T`; the map `Form` consumes via its `validate` prop. Build one from a schema with `zodResolver`. */
export type Validators<T> = { [K in keyof T]?: Validator<T, K> }

/** When the reducer runs validators: on a field's first blur (`'touched'`), on each change of a field (`'change'`), or only on submit (`'submit'`). A change validates that field and the fields that are touched or have a result already, so that a cross-field rule (a confirmation) stays current. It does not validate a field that the user has not used. A change of one field does not replace an issue of another field that came from `setErrors` or a `{ fieldErrors }` return. */
export type ValidateOn = 'touched' | 'change' | 'submit'

/**
 * Reducer state for one form: current `values`, the `defaults` that `values`
 * compare against for dirtiness, and the {@link Errors} and {@link Touched} maps.
 * `external` holds the keys whose current issue came from `set-errors-external`.
 * A change of another field does not replace those issues.
 * @internal
 */
export type FormState<T> = {
	values: T
	defaults: T
	errors: Errors
	touched: Touched
	external: Record<string, true>
}

/**
 * Discriminated action set for the form reducer. An action writes a value,
 * marks a field touched, merges external errors, re-syncs controlled values
 * and the defaults with them, resets to new defaults or to the held ones, or
 * commits a full-field submit validation.
 *
 * @internal
 */
export type FormAction<T> =
	| {
			type: 'set-value'
			name: string
			value: unknown
			validate: Validators<T> | undefined
			validateOn: ValidateOn
	  }
	| {
			type: 'set-touched'
			name: string
			validate: Validators<T> | undefined
			validateOn: ValidateOn
	  }
	| { type: 'set-errors-external'; errors: Errors }
	| { type: 'sync-values'; values: T }
	| { type: 'reset'; defaults?: T }
	| { type: 'submit-validate'; touched: Touched; errors: Errors }

/**
 * Optional shape returned from `onSubmit` to surface server-side validation
 * issues without round-tripping through `helpers.setErrors`.
 *
 * @remarks
 * An entry of `''` is an issue. An entry of `undefined` or `[]` clears the
 * field. When no entry has an issue, the return counts as a success.
 */
export type SubmitResult<T> = {
	fieldErrors?: Partial<Record<keyof T, string | string[] | undefined>>
}

/**
 * Terminal outcome of one submit attempt, delivered to `onSettled`. Client
 * validation failures and `{ fieldErrors }` returns with at least one issue
 * are mid-flow and do not fire `onSettled`. A `{ fieldErrors }` return with no
 * issue is a success. On success, `values` are the values that `onSubmit` got,
 * not the values after a later write or reset.
 */
export type SubmitOutcome<T> = { ok: true; values: T } | { ok: false; error: Error }

/** Second argument to a {@link FormSubmitHandler}: imperatively set field errors (e.g. from a server response) or reset the form, optionally to new defaults. */
export type FormHelpers<T> = {
	setErrors: (errors: Partial<Record<keyof T, string | string[]>>) => void
	/**
	 * Resets the form, optionally to new defaults.
	 *
	 * @remarks
	 * From the handler of the current attempt, the reset keeps that attempt live:
	 * `submitting` stays `true` until the handler settles, and `onSettled` gets
	 * its outcome. From the handler of an attempt that a newer submit or an
	 * outside reset superseded, it supersedes the current submit, as `reset`
	 * from the form actions does.
	 */
	reset: (nextDefaults?: T) => void
}

/**
 * Return nothing (or `Promise<void>`) for success. Optionally return a
 * `SubmitResult<T>`, sync or async, to surface server-side validation
 * issues without going through `helpers.setErrors`. A `SubmitResult<T>` with
 * no issue applies its clears and counts as a success. Throw or reject to
 * trigger `onSettled({ ok: false, error })`. Annotate the return as
 * `satisfies SubmitResult<T>` for autocomplete on the shape.
 */
export type FormSubmitHandler<T> = (values: T, helpers: FormHelpers<T>) => unknown

/**
 * How a filter bar answers a width that cannot hold its fields.
 *
 * `stack` drops them into a column on a narrow screen, which is right for a bar
 * over a page. The page scrolls anyway, so the column costs nothing but height.
 * `rail` holds one row at every width and scrolls it sideways instead. That
 * suits a bar over something the reader has to keep seeing, where a column of
 * fields would take the thing the bar filters.
 */
export type FormFiltersLayout = 'stack' | 'rail'
