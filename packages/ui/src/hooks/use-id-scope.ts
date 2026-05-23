'use client'

import { useCallback, useId, useMemo } from 'react'

type UseIdScopeOptions = {
	id?: string
}

/** Stable scoped ID with a helper for deriving related IDs. */
export function useIdScope(options?: UseIdScopeOptions) {
	const generatedId = useId()

	const id = options?.id ?? generatedId

	const sub = useCallback((suffix: string) => `${id}-${suffix}`, [id])

	return useMemo(() => ({ id, sub }), [id, sub])
}
