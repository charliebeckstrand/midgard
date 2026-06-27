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
import { type FloatingPanelOptions, useFloatingPanel } from './use-floating-ui'

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
}

// Explicit return type: `@floating-ui/react-dom` is a transitive dep TS
// can't express in a portable `.d.ts` (TS2742); same constraint as `useFloatingPanel`.
type FloatingDisclosureResult = {
	open: boolean
	setOpen: (open: boolean) => void
	close: () => void
	triggerRef: RefObject<HTMLButtonElement | null>
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
 * `useInteractions`.
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
	...panelOptions
}: FloatingDisclosureOptions): FloatingDisclosureResult {
	const [open = false, setOpenInner] = useControllable<boolean>({
		value: openProp,
		defaultValue: defaultOpen ?? false,
		onValueChange: (next) => onOpenChange?.(next ?? false),
	})

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

	const triggerRef = useRef<HTMLButtonElement>(null)

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
	const dismiss = useDismiss(context, {
		escapeKey: false,
		// Spare presses that land in a *nested* floating portal — e.g. a Select
		// listbox opened from within this surface — which teleports outside this
		// panel's DOM subtree. There's no floating-ui node tree here, so match the
		// portal the way `useFloatingPanel`'s own listener does.
		outsidePress: (event) => {
			const target = event.target

			if (!(target instanceof Element)) return true

			const ownPortal = refs.floating.current?.closest('[data-floating-ui-portal]') ?? null

			const targetPortal = target.closest('[data-floating-ui-portal]')

			return !(targetPortal && targetPortal !== ownPortal)
		},
	})

	useEscapeLayer({
		open,
		layered: roleProp !== 'tooltip',
		onDismiss: close,
	})

	// `enabled: false` keeps the Hook call unconditional (rules of hooks) while
	// emitting no role/aria props for a component that owns its roles.
	const role = useRole(context, { role: roleProp ?? 'menu', enabled: roleProp !== null })

	return { open, setOpen, close, triggerRef, refs, floatingStyles, context, dismiss, role }
}
