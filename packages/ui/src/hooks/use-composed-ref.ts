'use client'

import { type Ref, type RefCallback, useCallback } from 'react'

/**
 * Merge several refs into one callback ref. Each provided ref — object or
 * function — receives the node on attach. Useful when a component keeps an
 * internal ref (for measurement or caret restoration) yet must also forward an
 * external `ref`. The callback is stable while the input refs are; when one
 * swaps identity, React re-runs the wiring (detach old, attach new) so the
 * replacement ref receives the node instead of going stale.
 */
export function useComposedRef<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
	const compose = (node: T | null) => {
		for (const ref of refs) {
			if (typeof ref === 'function') ref(node)
			else if (ref) (ref as { current: T | null }).current = node
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: the spread *is* the dependency list — one entry per input ref.
	return useCallback(compose, refs)
}
