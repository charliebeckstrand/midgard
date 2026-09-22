'use client'

import { isTypeableElement } from '@floating-ui/react/utils'
import { type Ref, type RefCallback, useCallback, useLayoutEffect, useRef } from 'react'
import { useComposedRef } from './use-composed-ref'

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
 * {@link useComposedRef} cannot carry `setReference` itself. The floating-ui
 * `useMergeRefs` returns no cleanup of its own, so React calls it with `null` on
 * unmount and it nulls every input ref alike.
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

/**
 * {@link useFloatingReference}, with registration held back to the first open.
 *
 * A closed disclosure has no use for a reference. Positioning, `autoUpdate`,
 * the escape layer, and outside-press all begin at the open. Registration at
 * mount instead renders every closed one twice, because `setReference` is a
 * state setter and the ref callback calls it during the commit. This hook
 * stashes the node and registers it in a layout effect on the first open. It
 * is a layout effect, not a passive one. The effect runs in the commit that
 * mounts the panel, so the engine holds the reference before that commit
 * paints.
 *
 * The deferral moves one render rather than deleting it. The mount sheds a
 * render and the first open gains one, so it pays where closed instances
 * outnumber opens. `__benchmarks__/browser/README.md` holds the figures for
 * `Menu` and for `Popover`.
 *
 * @remarks Only for a trigger that the engine does not read while it is shut.
 * `useClick` qualifies with one exception. Its key handlers read the
 * reference, so that Space types into a typeable node rather than opening. A
 * typeable node therefore registers at mount. A trigger that binds listeners
 * to the reference node must register at mount too. The engine keys
 * `useHover`'s listener effect on `elements.domReference`. A deferred
 * {@link TooltipTrigger} would therefore lose its hover close path and its
 * safe-polygon handling. Such a trigger calls {@link useFloatingReference}
 * directly.
 *
 * @param setReference - The floating element's reference setter.
 * @param open - Whether the disclosure is open. The first `true` registers a
 * node that did not register at mount.
 * @param triggerRef - The trigger's own ref, or `undefined` where it keeps none.
 * @param childRef - A cloned child's `ref`, or `undefined` where there is no child.
 * @returns One callback ref for the trigger node.
 * @internal
 */
export function useDeferredFloatingReference<T extends HTMLElement>(
	setReference: (node: HTMLElement | null) => void,
	open: boolean,
	triggerRef: Ref<T> | undefined,
	childRef: Ref<T> | undefined,
): RefCallback<T> {
	// The node the engine anchors to, held here until the first open.
	const referenceNode = useRef<HTMLElement | null>(null)

	// Set once the engine holds a reference, after which a node swap forwards at
	// once rather than waiting for another open — the behaviour registration at
	// mount gave for free.
	const registered = useRef(false)

	const captureReference = useCallback(
		(node: HTMLElement | null) => {
			referenceNode.current = node

			// `useClick` reads the reference on each key event, open or shut, and
			// lets Space through to a typeable node. A deferred one reads as `null`.
			if (isTypeableElement(node)) registered.current = true

			if (registered.current) setReference(node)
		},
		[setReference],
	)

	useLayoutEffect(() => {
		if (!open) return

		registered.current = true

		setReference(referenceNode.current)
	}, [open, setReference])

	return useFloatingReference<T>(captureReference, triggerRef, childRef)
}
