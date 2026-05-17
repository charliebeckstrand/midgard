const INVALID = { 'data-invalid': '', 'aria-invalid': true } as const

export type InvalidAttrs = typeof INVALID | undefined

/**
 * Returns the data-invalid / aria-invalid attribute pair to spread onto a form
 * control when its validation state is invalid, or undefined otherwise. JSX
 * spread treats undefined as a no-op, so the caller can always spread
 * unconditionally.
 *
 * @example
 *   <input {...invalidAttrs(resolvedInvalid)} />
 */
export function invalidAttrs(invalid: boolean | undefined): InvalidAttrs {
	return invalid ? INVALID : undefined
}
