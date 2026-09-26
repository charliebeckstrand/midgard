'use client'

/**
 * Composes the space-separated reference list an `aria-labelledby` /
 * `aria-describedby` expects from a set of candidate ids, or `undefined` when
 * none are present. Falsy tokens drop out; callers can inline presence checks
 * (`useAriaIds(descriptionId, hasError && errorId)`). A hook by the `use-*`
 * convention; call it at the top level of a component or hook.
 */
export function useAriaIds(...ids: Array<string | false | null | undefined>): string | undefined {
	return joinAriaIds(ids)
}

/**
 * The plain function behind {@link useAriaIds}. It takes the ids as one list,
 * so a caller with a computed list does not spread it into a hook call. The
 * React Compiler cannot compile a spread argument to a hook.
 *
 * @internal
 */
export function joinAriaIds(
	ids: ReadonlyArray<string | false | null | undefined>,
): string | undefined {
	return ids.filter(Boolean).join(' ') || undefined
}
