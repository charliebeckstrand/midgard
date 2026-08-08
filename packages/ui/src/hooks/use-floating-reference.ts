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
 * @param setReference - The floating element's reference setter.
 * @param triggerRef - The trigger's own ref, or `undefined` where it keeps none.
 * @param childRef - A cloned child's `ref`, or `undefined` where there is no child.
 * @returns One callback ref for the trigger node.
 * @internal
 */
export function useFloatingReference<T extends HTMLElement>(
	setReference: (node: HTMLElement | null) => void,
	triggerRef: Ref<T> | undefined,
	childRef: Ref<T> | undefined,
): RefCallback<T> {
	// Fixed arity, because these two reach the dependency array of the composed
	// ref and React rejects an array whose length changes between renders.
	const setOwnRefs = useComposedRef<T>(triggerRef, childRef)

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
