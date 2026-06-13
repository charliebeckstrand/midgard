'use client'

import { useCallback, useId, useMemo } from 'react'

type IdScopeOptions = {
	id?: string
}

/**
 * Stable scoped id with a helper for deriving related ids. Falls back to a
 * `useId`-generated base when no `id` is supplied.
 *
 * @param options.id - Explicit base id; overrides the generated one.
 * @returns `{ id, sub }` where `id` is the stable base and `sub(suffix)`
 * derives a related id as `` `${id}-${suffix}` ``.
 */
export function useIdScope(options?: IdScopeOptions) {
	const generatedId = useId()

	const id = options?.id ?? generatedId

	const sub = useCallback((suffix: string) => `${id}-${suffix}`, [id])

	return useMemo(() => ({ id, sub }), [id, sub])
}
