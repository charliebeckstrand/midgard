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
import { type FloatingPanelOptions, useFloatingPanel } from './use-floating-ui'

type FloatingDisclosureRole = 'dialog' | 'menu' | 'tooltip' | 'listbox'

type FloatingDisclosureGate = (next: boolean, refs: ExtendedRefs<ReferenceType>) => boolean

type FloatingDisclosureOptions = Omit<
	FloatingPanelOptions,
	'open' | 'onOpenChange' | 'restoreFocusTo'
> & {
	open?: boolean
	defaultOpen?: boolean
	onOpenChange?: (open: boolean) => void
	role: FloatingDisclosureRole
	/** Vetoes an open-state transition when it returns `false`. */
	gate?: FloatingDisclosureGate
}

// Explicit return type: TS can't write a portable `.d.ts` referencing
// `@floating-ui/react-dom` (TS2742), same constraint as `useFloatingPanel`.
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
		restoreFocusTo: triggerRef,
	})

	refsRef.current = refs

	const dismiss = useDismiss(context)

	const role = useRole(context, { role: roleProp })

	return { open, setOpen, close, triggerRef, refs, floatingStyles, context, dismiss, role }
}
