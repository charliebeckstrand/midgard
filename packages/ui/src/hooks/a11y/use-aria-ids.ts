'use client'

/**
 * Composes the space-separated reference list an `aria-labelledby` /
 * `aria-describedby` expects from a set of candidate ids, or `undefined` when
 * none are present — so the attribute is omitted rather than pointing at
 * nothing. Falsy tokens drop out, which lets callers inline presence checks
 * (`useAriaIds(descriptionId, hasError && errorId)`). A hook by the suite's
 * `use-*` convention; call it at the top level of a component or hook.
 */
export function useAriaIds(...ids: Array<string | false | null | undefined>): string | undefined {
	const present = ids.filter((id): id is string => Boolean(id))

	return present.length ? present.join(' ') : undefined
}
