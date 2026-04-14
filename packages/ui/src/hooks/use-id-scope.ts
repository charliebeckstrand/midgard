'use client'

import { useCallback, useId, useMemo } from 'react'

export type IdScope = {
	/** The root scoped ID. */
	id: string
	/** Derive a child ID: `scope.sub('description')` → `'${id}-description'`. */
	sub: (suffix: string) => string
}

/**
 * Generates a stable scoped ID with a helper for deriving related IDs.
 *
 * Useful anywhere multiple elements need coordinated IDs — form fields,
 * disclosure widgets, dialogs, etc.
 *
 *     const scope = useIdScope()
 *     scope.id                  // ":r1:"
 *     scope.sub('trigger')      // ":r1:-trigger"
 *     scope.sub('panel')        // ":r1:-panel"
 */
export function useIdScope(options?: { id?: string }): IdScope {
	const generatedId = useId()

	const id = options?.id ?? generatedId

	const sub = useCallback((suffix: string) => `${id}-${suffix}`, [id])

	return useMemo(() => ({ id, sub }), [id, sub])
}
