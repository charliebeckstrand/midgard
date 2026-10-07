'use client'

import { type Ref, type RefCallback, useState } from 'react'

/**
 * Give `node` to one ref, and return the function that takes it back. A
 * callback ref that returns a cleanup (React 19) gets that cleanup. Any other
 * callback ref gets `null`.
 */
function attach<T>(ref: Ref<T> | undefined, node: T): (() => void) | undefined {
	if (ref == null) return undefined

	if (typeof ref === 'function') {
		const cleanup = ref(node)

		return typeof cleanup === 'function' ? cleanup : () => ref(null)
	}

	ref.current = node

	return () => {
		ref.current = null
	}
}

/** The cleanup of the node that the refs hold now, shared by each merged callback of one hook. */
type CleanupHolder = { cleanup?: () => void }

/** One callback ref over `refs`, or `null` when every ref is absent. */
function mergeRefs<T>(refs: (Ref<T> | undefined)[], holder: CleanupHolder): RefCallback<T> | null {
	if (refs.every((ref) => ref == null)) return null

	return (node: T | null) => {
		holder.cleanup?.()

		holder.cleanup = undefined

		if (node == null) return

		const cleanups = refs.map((ref) => attach(ref, node))

		holder.cleanup = () => {
			for (const cleanup of cleanups) cleanup?.()
		}
	}
}

/** Whether two ref lists hold the same refs in the same order. */
function sameRefs<T>(a: (Ref<T> | undefined)[], b: (Ref<T> | undefined)[]): boolean {
	return a.length === b.length && a.every((ref, index) => ref === b[index])
}

/**
 * Merge several refs into one callback ref. Each provided ref (object or
 * function) receives the node on attach. Useful when a component keeps an
 * internal ref (for measurement or caret restoration) yet must also forward an
 * external `ref`. A callback ref that returns a React 19 cleanup function gets
 * that cleanup on detach, and any other ref gets `null`. It rewires when an
 * input ref swaps identity (detach old, attach new), so the replacement ref
 * receives the node instead of going stale. Returns `null` when every input
 * ref is absent.
 *
 * @remarks The merged callback returns no cleanup. React therefore calls it
 * with `null` on detach, and a caller can also call it with `null` itself.
 * The merge is local rather than the `useMergeRefs` of floating-ui, so that a
 * route with an `Input` does not load `@floating-ui/react`.
 */
export function useComposedRef<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> | null {
	// The cleanup outlives a swap of the merged callback, so the next call
	// detaches what the last one attached.
	const [holder] = useState<CleanupHolder>(() => ({}))

	const [merged, setMerged] = useState(() => ({ refs, callback: mergeRefs(refs, holder) }))

	// Adjusted during render: a new ref list gets a new callback, and React
	// detaches the old one and attaches the new one in the same commit.
	if (!sameRefs(merged.refs, refs)) {
		const next = { refs, callback: mergeRefs(refs, holder) }

		setMerged(next)

		return next.callback
	}

	return merged.callback
}
