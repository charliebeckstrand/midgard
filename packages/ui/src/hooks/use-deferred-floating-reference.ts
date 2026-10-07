'use client'

import { isTypeableElement } from '@floating-ui/react/utils'
import { type Ref, type RefCallback, useCallback, useLayoutEffect, useRef } from 'react'
import { useFloatingReference } from './use-floating-reference'

/**
 * {@link useFloatingReference}, with registration held back to the first open.
 *
 * A closed disclosure has no use for a reference. Positioning, `autoUpdate`,
 * the escape layer, and outside-press all begin at the open. Registration at
 * mount instead renders every closed one twice, because `setReference` is a
 * state setter and the ref callback calls it during the commit.
 *
 * This hook stashes the node, and a layout effect registers it at each open.
 * The engine's setters bail out on a node that they already hold, so only the
 * first open costs a render. It is a layout effect, not a passive one. It
 * runs in the commit where `open` flips. The portal mounts the panel one
 * synchronous commit later, so the engine holds the reference before the
 * panel paints.
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
	// once rather than waiting for another open — the behavior registration at
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
