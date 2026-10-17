'use client'

import { useComposedRefs } from 'motion/react'
import { type Ref, type RefCallback, useCallback } from 'react'

/**
 * Compose a floating element's `setReference` with the refs a trigger owns
 * itself, into the one callback ref the trigger takes. Those refs are its
 * `triggerRef` and a cloned child's `ref`.
 *
 * `setReference` gets the node on attach and never gets `null`. React 19 skips
 * the null call on unmount when a ref callback returns a cleanup, and this
 * callback always returns one. `setReference(null)` runs during deletion
 * effects, where its state update can cascade into a "Maximum update depth"
 * error while ancestor state is in flux. The other refs are safe to null, and
 * the cleanup nulls them.
 *
 * {@link useComposedRefs} cannot carry `setReference` itself. It returns a
 * cleanup only when an input ref returns one. Otherwise React calls it with
 * `null` on unmount, and it nulls every input ref alike.
 *
 * @remarks A caller can pass its own capture function here rather than the
 * engine's setter, and register the node later.
 * {@link useDeferredFloatingReference} composes this hook to do exactly that.
 * The contract above holds for whatever callback this parameter receives.
 *
 * @param setReference - The floating element's reference setter, or a caller's
 * own stand-in for it.
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
	const setOwnRefs = useComposedRefs<T>(triggerRef, childRef)

	return useCallback(
		(node: T | null) => {
			setReference(node)

			// A React 19 cleanup from an own ref runs in place of the null call.
			const cleanup = setOwnRefs(node)

			return () => {
				if (typeof cleanup === 'function') cleanup()
				else setOwnRefs(null)
			}
		},
		[setReference, setOwnRefs],
	)
}
