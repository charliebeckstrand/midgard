'use client'

import { useMergeRefs } from '@floating-ui/react'
import type { Ref, RefCallback } from 'react'

/**
 * Merge several refs into one callback ref. Each provided ref (object or
 * function) receives the node on attach. Useful when a component keeps an
 * internal ref (for measurement or caret restoration) yet must also forward an
 * external `ref`. Delegates to floating-ui's `useMergeRefs`, which also honors
 * React 19 ref cleanup functions and rewires when an input ref swaps identity
 * (detach old, attach new) so the replacement ref receives the node instead of
 * going stale. Returns `null` when every input ref is absent.
 */
export function useComposedRef<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> | null {
	return useMergeRefs(refs)
}
