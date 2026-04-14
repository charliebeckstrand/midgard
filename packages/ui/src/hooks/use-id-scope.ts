'use client'

import { useCallback, useId, useMemo } from 'react'

export type IdScope = {
	/** Root scoped ID. */
	id: string
	/** Derives a child ID by appending a suffix. */
	sub: (suffix: string) => string
}

/** Stable scoped ID with a helper for deriving related IDs. */
export function useIdScope(options?: { id?: string }): IdScope {
	const generatedId = useId()

	const id = options?.id ?? generatedId

	const sub = useCallback((suffix: string) => `${id}-${suffix}`, [id])

	return useMemo(() => ({ id, sub }), [id, sub])
}
