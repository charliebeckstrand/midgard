'use client'

import type {
	ElementProps,
	ExtendedRefs,
	FloatingRootContext,
	OpenChangeReason,
	ReferenceType,
} from '@floating-ui/react'
import {
	type CSSProperties,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
} from 'react'
import { notifyOverlaySignal } from '../primitives/overlay/overlay-signal'
import { useControllableFlag } from './use-controllable'
import { type FloatingRole, useFloatingDismissal } from './use-floating-dismissal'
import { type FloatingPanelOptions, useFloatingPanel } from './use-floating-panel'

type FloatingDisclosureGate = (
	next: boolean,
	refs: ExtendedRefs<ReferenceType>,
	reason?: OpenChangeReason,
) => boolean

/** Options for {@link useFloatingDisclosure}: the panel options, the open-state triad, the role, the gate, and the dismiss and signal flags. */
export type FloatingDisclosureOptions = Omit<
	FloatingPanelOptions,
	'open' | 'onOpenChange' | 'returnFocusTo'
> & {
	open?: boolean
	defaultOpen?: boolean
	onOpenChange?: (open: boolean) => void
	/**
	 * Popup role floating-ui stamps on the floating element plus the reference's
	 * `aria-haspopup`/`aria-controls`/`aria-expanded`. Pass `null` when the
	 * component hand-rolls those on inner elements. A role here also stamps
	 * the positioning wrapper with a duplicate.
	 */
	role: FloatingRole | null
	/**
	 * Vetoes an open-state transition when it returns `false`. A transition that
	 * an interaction hook of floating-ui requests gives its reason, such as
	 * `'hover'`. A call to `setOpen` gives no reason.
	 */
	gate?: FloatingDisclosureGate
	/**
	 * Whether the surface answers the shared dismiss affordances: Escape through
	 * the dismiss-layer stack, and an outside pointer press.
	 *
	 * Pass `false` for a surface that is not really a disclosure. An inline
	 * static menu renders open in the document flow and has no dismissed state.
	 * Registered, it would claim a slot on the dismiss stack and report a close
	 * it never performs. It would also swallow the Escape press meant for a
	 * Dialog above it.
	 *
	 * @defaultValue true
	 */
	dismissable?: boolean
	/**
	 * Sends the overlay signal each time the surface opens, as an `Overlay` does.
	 * An open tooltip closes on the signal. Set it for a surface that a reader
	 * opens on purpose, such as a popover or a menu. A tooltip does not set it.
	 *
	 * @defaultValue false
	 */
	signal?: boolean
}

// Explicit return type: `@floating-ui/react-dom` is a transitive dep TS
// can't express in a portable `.d.ts` (TS2742); same constraint as `useFloatingPanel`.
/** Return shape of {@link useFloatingDisclosure}: the open state and its setters, the trigger ref, the floating-ui wiring, and the dismiss and role interactions. */
export type FloatingDisclosureResult = {
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
 * dismiss, role }`. These are the resolved open flag with its gated setter /
 * `close` shortcut, and the trigger ref focus restores to. They also carry
 * floating-ui's `refs` / `floatingStyles` / `context`. The `dismiss` and `role`
 * `ElementProps` come pre-built, to merge with the consumer's own interaction
 * hooks.
 */
export function useFloatingDisclosure({
	open: openProp,
	defaultOpen,
	onOpenChange,
	role: roleProp,
	gate,
	dismissable = true,
	signal = false,
	...panelOptions
}: FloatingDisclosureOptions): FloatingDisclosureResult {
	const [open, setOpenInner] = useControllableFlag({
		value: openProp,
		defaultValue: defaultOpen,
		onValueChange: onOpenChange,
	})

	// Refs, not effect events. A caller can call `setOpen` during render, as an
	// adjustment, and an effect event throws when render calls it. `gate` is also optional, and
	// `setOpen` tests it for presence, which an effect event cannot express.
	const gateRef = useRef(gate)

	const refsRef = useRef<ExtendedRefs<ReferenceType> | null>(null)

	// Floating-ui calls it with the event and the reason of the change. The gate
	// gets the reason.
	const setOpen = useCallback(
		(next: boolean, _event?: Event, reason?: OpenChangeReason) => {
			if (gateRef.current && refsRef.current && !gateRef.current(next, refsRef.current, reason))
				return

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

	// Synced before paint, not during render. Events run after the commit. A set
	// during render reads the gate and the refs of the last commit.
	useLayoutEffect(() => {
		gateRef.current = gate

		refsRef.current = refs
	})

	useEffect(() => {
		if (signal && open) notifyOverlaySignal()
	}, [signal, open])

	const { dismiss, role } = useFloatingDismissal(context, refs, {
		open,
		role: roleProp,
		dismissable,
	})

	return { open, setOpen, close, triggerRef, refs, floatingStyles, context, dismiss, role }
}
