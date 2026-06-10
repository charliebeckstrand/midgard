'use client'

import { type Ref, type RefCallback, useCallback, useRef } from 'react'

/**
 * Merge several refs into one stable callback ref. Each provided ref (object
 * or function) receives the node on attach. Useful when a component keeps an
 * internal ref (for measurement or caret restoration) yet must also forward an
 * external `ref`. The returned callback is stable across renders and always
 * writes to the latest refs.
 */
export function useComposedRef<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
	const refsRef = useRef(refs)

	refsRef.current = refs

	return useCallback((node: T | null) => {
		for (const ref of refsRef.current) {
			if (typeof ref === 'function') ref(node)
			else if (ref) (ref as { current: T | null }).current = node
		}
	}, [])
}
