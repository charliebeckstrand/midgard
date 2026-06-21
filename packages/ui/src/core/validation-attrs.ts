import { type InvalidAttrs, invalidAttrs } from './invalid-attrs'

/** Field-level validation / status severity: a blocking `error`, an advisory `warning`, or a positive `success`. */
export type Severity = 'error' | 'warning' | 'success'

const WARNING = { 'data-warning': '' } as const

const VALID = { 'data-valid': '' } as const

/** The data / aria attribute object spread onto a control for a {@link Severity}, or undefined for none. */
export type ValidationAttrs = InvalidAttrs | typeof WARNING | typeof VALID

/**
 * Returns the data-* / aria attribute object to spread onto a form control for
 * its resolved {@link Severity}, or undefined when there is none. JSX spread
 * treats undefined as a no-op, so callers spread unconditionally. The states
 * are mutually exclusive: `error` reuses the {@link invalidAttrs} pair
 * (`data-invalid` + `aria-invalid`), `warning` emits `data-warning`, and
 * `success` emits `data-valid` — each keying the matching kasane validation
 * ring (red / amber / green). Returns frozen singletons, so spreads stay
 * referentially stable across renders.
 *
 * @param severity - The resolved field severity, or undefined for no state.
 * @returns The attribute object for `severity`, or undefined.
 * @see {@link invalidAttrs}
 * @example
 *   <input {...validationAttrs(control?.severity)} />
 */
export function validationAttrs(severity: Severity | undefined): ValidationAttrs {
	switch (severity) {
		case 'error':
			return invalidAttrs(true)
		case 'warning':
			return WARNING
		case 'success':
			return VALID
		default:
			return undefined
	}
}
