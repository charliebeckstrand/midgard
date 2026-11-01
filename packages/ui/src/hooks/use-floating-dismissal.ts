'use client'

import {
	type ElementProps,
	type ExtendedRefs,
	type FloatingRootContext,
	type ReferenceType,
	useDismiss,
	useRole,
} from '@floating-ui/react'
import { useEffect } from 'react'
import { subscribeDocumentEvent } from '../utilities/document-listener'
import {
	closestFloatingPortal,
	foreignFloatingPortal,
	hasPortalReference,
	publishPortalReference,
	referenceOpenedWithin,
} from '../utilities/floating-portal-registry'
import { isScrollbarPress } from '../utilities/scrollbar-press'
import { useEscapeLayer } from './use-escape-layer'

/** Ref shape {@link isOutsidePress} needs from a floating panel's `refs`. @internal */
type FloatingOutsidePressRefs = Pick<
	ExtendedRefs<ReferenceType>,
	'floating' | 'domReference' | 'reference'
>

/**
 * The DOM element a floating panel is anchored to: its `domReference` for a
 * normal disclosure. A right-click context menu anchored at the cursor via
 * `setPositionReference` takes the position reference's `contextElement`
 * instead. That route leaves `domReference` null. Both point at where in the DOM the
 * panel was opened from, which the ancestor-portal test needs even when no DOM
 * reference was set.
 *
 * @internal
 */
function floatingReferenceElement(refs: FloatingOutsidePressRefs): Element | null {
	if (refs.domReference.current) return refs.domReference.current

	const positionReference = refs.reference.current

	return positionReference && 'contextElement' in positionReference
		? (positionReference.contextElement ?? null)
		: null
}

/**
 * Publishes this panel's reference against its portal node while it is open, so
 * a sibling panel's outside-press test can recognize it.
 *
 * @internal
 */
function useFloatingPortalReference(
	context: FloatingRootContext,
	refs: FloatingOutsidePressRefs,
): void {
	const { open, elements } = context

	// Keyed on the state-tracked floating element, not `refs.floating.current`:
	// the panel mounts inside its portal a commit after `open` flips, so a ref
	// read here would still be null and never re-run.
	const floatingElement = elements.floating

	useEffect(() => {
		if (!open) return

		const portal = closestFloatingPortal(floatingElement)

		if (!portal) return

		return publishPortalReference(portal, () => floatingReferenceElement(refs))
	}, [open, refs, floatingElement])
}

/**
 * Closes `context` on a document `pointerdown` that {@link isOutsidePress}
 * calls outside the panel, while `enabled`.
 *
 * @remarks
 * The listener stands in for floating-ui's own `outsidePress`, which the two
 * callers disable (see {@link isOutsidePress} for why). One hook rather
 * than the same effect in each, so the guard and the predicate cannot drift
 * apart between them.
 *
 * `context.onOpenChange` is floating-ui's own effect event: one identity for the
 * whole mount, always calling the newest `onOpenChange` this package handed
 * `useFloating`. So it is safe both to call directly and to name as a
 * dependency, and this needs no shadow of its own. Depending on the whole
 * `context` would not be safe: that object is rebuilt on every reposition, and
 * would resubscribe the listener each time.
 *
 * @internal
 */
function useFloatingOutsidePress(
	context: FloatingRootContext,
	refs: FloatingOutsidePressRefs,
	enabled: boolean,
): void {
	const { onOpenChange } = context

	useEffect(() => {
		if (!enabled) return

		const onPointerDown = (event: PointerEvent) => {
			if (isOutsidePress(event, refs)) onOpenChange(false, event, 'outside-press')
		}

		return subscribeDocumentEvent('pointerdown', onPointerDown)
	}, [enabled, refs, onOpenChange])
}

/**
 * True when a document `pointerdown` at `event` falls outside the floating
 * panel described by `refs`. Outside means not inside the panel or its
 * reference, and not a press on the panel's own scrollbar. It also means not
 * inside a floating surface opened from within this panel. A Select listbox is
 * one, as is the calendar's month/year popover inside a DatePicker dialog.
 * Those surfaces teleport outside this
 * panel's DOM subtree, so the containment checks miss them;
 * {@link isPressInNested} owns that relation and the rule it applies.
 *
 * @see {@link useFloatingOutsidePress}, the document `pointerdown` listener
 * {@link useFloatingUI} and `useFloatingDisclosure` share, instead of
 * floating-ui's built-in `useDismiss` outsidePress, which, via its
 * "third-party element" escape hatch, spares *any* outside press once some
 * other modal on the page has marked sibling elements `inert`, exactly the case
 * whenever a floating panel opens inside a Dialog/Sheet.
 */
function isOutsidePress(event: PointerEvent, refs: FloatingOutsidePressRefs): boolean {
	const target = event.target

	if (!(target instanceof Node)) return false

	const floating = refs.floating.current

	if (!floating) return false

	// Cheapest tests first, and both are the common case: a press inside the
	// open panel or on its trigger. Returning here skips `isScrollbarPress`'s
	// forced style recalc and two `closest` walks on every such press, per open
	// panel.
	if (floating.contains(target) || refs.domReference.current?.contains(target)) return false

	// `isPressInNested` is pure DOM ancestry; `isScrollbarPress` forces
	// a style recalc and four layout reads. Same verdict either way, so the cheap
	// one decides first: a press into a nested surface, which is what this
	// predicate exists for, never reaches the recalc.
	return !(
		isPressInNested(floating, target, refs) ||
		(target instanceof HTMLElement && isScrollbarPress(event, target))
	)
}

/**
 * Whether `target` lies in a floating surface opened from *within* `floating`:
 * a descendant, whose presses this panel must survive.
 *
 * @remarks
 * The descendancy rule itself lives in `referenceOpenedWithin`, shared with the
 * `Overlay` boundaries that ask the same question through
 * `pressLandsInSurfaceOpenedWithin`. A surface that published its reference is a
 * descendant only when that reference sits inside this panel. A getter that
 * yields nothing (a context menu anchored at a bare coordinate) claims no
 * descendancy, so the press dismisses. What this predicate adds is the fallback
 * below. A portal that never registered at all keeps the older ancestor test,
 * which is all that is knowable about it.
 *
 * @internal
 */
function isPressInNested(floating: Element, target: Node, refs: FloatingOutsidePressRefs): boolean {
	const targetPortal = foreignFloatingPortal(floating, target)

	if (!targetPortal) return false

	// A surface that published a reference answers for itself, by the shared rule.
	if (hasPortalReference(targetPortal)) return referenceOpenedWithin(floating, targetPortal)

	// Nothing published: the older ancestor test is all that is knowable.
	const reference = floatingReferenceElement(refs)

	return !(reference != null && targetPortal.contains(reference))
}

/**
 * The popup role that floating-ui stamps on the floating element, with the
 * `aria-haspopup`, `aria-controls`, and `aria-expanded` of the reference.
 */
export type FloatingRole = 'listbox' | 'menu' | 'dialog' | 'tooltip'

/** Options for {@link useFloatingDismissal}. @internal */
type FloatingDismissalOptions = {
	open: boolean
	/** The popup role, or `null` for a surface that owns its roles. */
	role: FloatingRole | null
	/** Whether the surface answers Escape and an outside press. */
	dismissable: boolean
}

/**
 * The dismiss and role wiring that {@link useFloatingUI} and
 * `useFloatingDisclosure` share.
 *
 * Escape goes through the shared dismiss-layer stack, not through the flat
 * document listener of floating-ui. Then a surface inside a Dialog or a Sheet
 * consumes the press, and the surface below stays open. A tooltip stays out of
 * the stack. It closes on any Escape, and the layer below still gets the press.
 *
 * The outside press goes through {@link useFloatingOutsidePress}, not through
 * the built-in `outsidePress` of `useDismiss`. That option has a "third-party
 * element" escape hatch. It spares any outside press when another modal marks
 * sibling elements `inert`, which is the case inside a Dialog or a Sheet.
 *
 * Dismissals go through `context.onOpenChange`, so the close reason gets to the
 * focus return of `useFloatingPanel` and to the `openchange` listeners of
 * floating-ui. The `'escape-key'` reason arms the re-open block of `useFocus`.
 *
 * @returns The `dismiss` and `role` interactions, for `useInteractions`.
 * @internal
 */
export function useFloatingDismissal(
	context: FloatingRootContext,
	refs: ExtendedRefs<ReferenceType>,
	{ open, role: roleProp, dismissable }: FloatingDismissalOptions,
): { dismiss: ElementProps; role: ElementProps } {
	const dismiss = useDismiss(context, { escapeKey: false, outsidePress: false })

	useEscapeLayer({
		open,
		enabled: dismissable,
		layered: roleProp !== 'tooltip',
		onDismiss: (event) => context.onOpenChange(false, event, 'escape-key'),
	})

	// Published whether or not the panel dismisses on an outside press. A test in
	// a sibling reads it to tell a nested surface from an unrelated one.
	useFloatingPortalReference(context, refs)

	useFloatingOutsidePress(context, refs, open && dismissable)

	// `enabled: false` keeps the Hook call unconditional (rules of hooks), and
	// gives no role props to a component that owns its roles.
	const role = useRole(context, { role: roleProp ?? 'listbox', enabled: roleProp !== null })

	return { dismiss, role }
}
