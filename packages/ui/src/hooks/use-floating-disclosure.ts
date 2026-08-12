'use client'

import {
	type ElementProps,
	type ExtendedRefs,
	type FloatingRootContext,
	type ReferenceType,
	useDismiss,
	useRole,
} from '@floating-ui/react'
import { type CSSProperties, type RefObject, useCallback, useRef } from 'react'
import { useControllable } from './use-controllable'
import { useEscapeLayer } from './use-escape-layer'
import {
	type FloatingPanelOptions,
	useFloatingOutsidePress,
	useFloatingPanel,
	useFloatingPortalReference,
} from './use-floating-ui'

type FloatingDisclosureRole = 'dialog' | 'menu' | 'tooltip' | 'listbox'

type FloatingDisclosureGate = (next: boolean, refs: ExtendedRefs<ReferenceType>) => boolean

type FloatingDisclosureOptions = Omit<
	FloatingPanelOptions,
	'open' | 'onOpenChange' | 'returnFocusTo'
> & {
	open?: boolean
	defaultOpen?: boolean
	onOpenChange?: (open: boolean) => void
	/**
	 * Popup role floating-ui stamps on the floating element plus the reference's
	 * `aria-haspopup`/`aria-controls`/`aria-expanded`. Pass `null` when the
	 * component hand-rolls those on inner elements; a role here also stamps
	 * the positioning wrapper with a duplicate.
	 */
	role: FloatingDisclosureRole | null
	/** Vetoes an open-state transition when it returns `false`. */
	gate?: FloatingDisclosureGate
	/**
	 * Whether the surface answers the shared dismiss affordances: Escape through
	 * the dismiss-layer stack, and an outside pointer press.
	 *
	 * Pass `false` for a surface that is not really a disclosure — an inline
	 * static menu renders open in the document flow and has no dismissed state.
	 * Registered, it would claim a slot on the dismiss stack, report a close it
	 * never performs, and swallow the Escape press meant for a Dialog above it.
	 *
	 * @defaultValue true
	 */
	dismissable?: boolean
}

// Explicit return type: `@floating-ui/react-dom` is a transitive dep TS
// can't express in a portable `.d.ts` (TS2742); same constraint as `useFloatingPanel`.
type FloatingDisclosureResult = {
	open: boolean
	setOpen: (open: boolean) => void
	close: () => void
	triggerRef: RefObject<HTMLElement | null>
	refs: ExtendedRefs<ReferenceType>
	floatingStyles: CSSProperties
	context: FloatingRootContext
	dismiss: ElementProps
	role: ElementProps
}

/**
 * Disclosure-level wrapper around `useFloatingPanel`: owns controllable
 * `open` state, the trigger ref, focus restoration, and the
 * dismiss + role interactions every floating overlay needs. Consumers
 * layer their own interaction hooks (hover, click, clientPoint, …) over
 * the returned `context` and combine them with `dismiss` + `role` via
 * `useInteractions`. A surface that renders inline rather than as a dismissable
 * overlay opts out of both dismiss affordances with `dismissable: false`.
 *
 * @returns `{ open, setOpen, close, triggerRef, refs, floatingStyles, context,
 * dismiss, role }`: the resolved open flag and its gated setter / `close`
 * shortcut, the trigger ref focus restores to, floating-ui's `refs` /
 * `floatingStyles` / `context`, and the pre-built `dismiss` and `role`
 * `ElementProps` to merge with the consumer's own interaction hooks.
 */
export function useFloatingDisclosure({
	open: openProp,
	defaultOpen,
	onOpenChange,
	role: roleProp,
	gate,
	dismissable = true,
	...panelOptions
}: FloatingDisclosureOptions): FloatingDisclosureResult {
	const [open = false, setOpenInner] = useControllable<boolean>({
		value: openProp,
		defaultValue: defaultOpen ?? false,
		onValueChange: (next) => onOpenChange?.(next ?? false),
	})

	// Deliberately still a render-phase shadow, where the package's sweep has
	// moved such callbacks to `useEffectEvent`. `gate` is optional and `setOpen`
	// tests it for presence, so an always-present effect event would report every
	// disclosure as gated. Converting this needs the presence test rewritten
	// first; see the effect-event plan.
	const gateRef = useRef(gate)
	gateRef.current = gate

	const refsRef = useRef<ExtendedRefs<ReferenceType> | null>(null)

	const setOpen = useCallback(
		(next: boolean) => {
			if (gateRef.current && refsRef.current && !gateRef.current(next, refsRef.current)) return

			setOpenInner(next)
		},
		[setOpenInner],
	)

	const close = useCallback(() => setOpen(false), [setOpen])

	const triggerRef = useRef<HTMLElement | null>(null)

	const { refs, floatingStyles, context } = useFloatingPanel({
		...panelOptions,
		open,
		onOpenChange: setOpen,
		returnFocusTo: triggerRef,
	})

	refsRef.current = refs

	// Escape goes through the shared dismiss-layer stack instead of
	// floating-ui's flat document listener, so a disclosure inside a
	// Dialog/Sheet consumes the press without also closing the surface
	// beneath. Tooltips stay unlayered: incidental hover surfaces close on
	// any Escape without swallowing the press meant for the layer below.
	// Outside-press is disabled here too: floating-ui's built-in outsidePress
	// has a "third-party element" escape hatch that spares *any* outside
	// press once some other modal on the page has marked sibling elements
	// `inert` — exactly the case whenever this disclosure opens inside a
	// Dialog/Sheet. The effect below stands in with the same document
	// `pointerdown` listener `useFloatingUI` uses, sidestepping that hatch.
	const dismiss = useDismiss(context, { escapeKey: false, outsidePress: false })

	// Dismissals route through `context.onOpenChange` rather than `setOpen`
	// directly, so the close reason reaches `useFloatingPanel`'s focus-return
	// effect and floating-ui's own `openchange` listeners. `'escape-key'` is
	// what arms `useFocus`'s re-open block: a surface that restores focus to
	// its trigger on close (an interactive Tooltip's focus trap) would
	// otherwise re-open on the focus its own dismissal caused.
	useEscapeLayer({
		open,
		enabled: dismissable,
		layered: roleProp !== 'tooltip',
		onDismiss: (event) => context.onOpenChange(false, event, 'escape-key'),
	})

	// Published whether or not this panel dismisses on an outside press: a
	// sibling's test reads it to tell a nested surface from an unrelated one, and
	// a non-dismissing panel (a tooltip) can still be the surface pressed into.
	useFloatingPortalReference(context, refs)

	useFloatingOutsidePress(context, refs, open && dismissable)

	// `enabled: false` keeps the Hook call unconditional (rules of hooks) while
	// emitting no role/aria props for a component that owns its roles.
	const role = useRole(context, { role: roleProp ?? 'menu', enabled: roleProp !== null })

	return { open, setOpen, close, triggerRef, refs, floatingStyles, context, dismiss, role }
}
