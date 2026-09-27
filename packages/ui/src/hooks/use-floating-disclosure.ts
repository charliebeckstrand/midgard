'use client'

import type {
	ElementProps,
	ExtendedRefs,
	FloatingRootContext,
	ReferenceType,
} from '@floating-ui/react'
import { type CSSProperties, type RefObject, useCallback, useRef } from 'react'
import { useControllableFlag } from './use-controllable'
import {
	type FloatingPanelOptions,
	useFloatingDismissal,
	useFloatingPanel,
} from './use-floating-ui'

type FloatingDisclosureRole = 'dialog' | 'menu' | 'tooltip' | 'listbox'

type FloatingDisclosureGate = (next: boolean, refs: ExtendedRefs<ReferenceType>) => boolean

/** Options for {@link useFloatingDisclosure}: the open-state triad it binds. */
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
	role: FloatingDisclosureRole | null
	/** Vetoes an open-state transition when it returns `false`. */
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
}

// Explicit return type: `@floating-ui/react-dom` is a transitive dep TS
// can't express in a portable `.d.ts` (TS2742); same constraint as `useFloatingPanel`.
/** Return shape of {@link useFloatingDisclosure}: the resolved open state and its setter. */
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
	...panelOptions
}: FloatingDisclosureOptions): FloatingDisclosureResult {
	const [open, setOpenInner] = useControllableFlag({
		value: openProp,
		defaultValue: defaultOpen,
		onValueChange: onOpenChange,
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

	const { dismiss, role } = useFloatingDismissal(context, refs, {
		open,
		role: roleProp,
		dismissable,
	})

	return { open, setOpen, close, triggerRef, refs, floatingStyles, context, dismiss, role }
}
