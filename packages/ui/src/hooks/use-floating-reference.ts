'use client'

import { type Ref, type RefCallback, useCallback } from 'react'
import { useComposedRef } from './use-composed-ref'

/**
 * Compose a floating element's `setReference` with the refs a trigger owns
 * itself — its `triggerRef`, a cloned child's `ref` — into the one callback ref
 * the trigger node takes.
 *
 * `setReference` gets the node on attach and never gets `null`. React 19 skips
 * the null call on unmount when a ref callback returns a cleanup, and this
 * callback always returns one: `setReference(null)` runs during deletion
 * effects, where its state update can cascade into a "Maximum update depth"
 * error while ancestor state is in flux. The other refs are safe to null, and
 * the cleanup nulls them.
 *
 * {@link useComposedRef} cannot carry `setReference` itself. floating-ui's
 * `useMergeRefs` returns no cleanup of its own, so React calls it with `null` on
 * unmount and it nulls every input ref alike.
 *
 * Give the same count of `refs` on every render. They become the dependency
 * array of the composed ref, which React rejects if its length changes — pass an
 * absent ref as `undefined` rather than dropping the argument.
 *
 * @param setReference - The floating element's reference setter.
 * @param refs - The trigger's own refs, each safe to null on unmount.
 * @returns One callback ref for the trigger node.
 * @internal
 */
export function useFloatingReference<T extends HTMLElement>(
	setReference: (node: HTMLElement | null) => void,
	...refs: (Ref<T> | undefined)[]
): RefCallback<T> {
	const setOwnRefs = useComposedRef<T>(...refs)

	return useCallback(
		(node: T | null) => {
			setReference(node)

			setOwnRefs?.(node)

			return () => {
				setOwnRefs?.(null)
			}
		},
		[setReference, setOwnRefs],
	)
}
