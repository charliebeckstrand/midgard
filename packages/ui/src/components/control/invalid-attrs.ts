const INVALID = { 'data-invalid': '', 'aria-invalid': true } as const

const NONE = {} as const

export type InvalidAttrs = typeof INVALID | typeof NONE

/**
 * Returns the data-invalid / aria-invalid attribute pair to spread onto a form
 * control when its validation state is invalid. Returns an empty object
 * otherwise so the caller can always spread unconditionally.
 *
 * @example
 *   <input {...invalidAttrs(resolvedInvalid)} />
 */
export function invalidAttrs(invalid: boolean | undefined): InvalidAttrs {
	return invalid ? INVALID : NONE
}
