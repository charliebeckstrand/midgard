'use client'

import {
	type Placement,
	safePolygon,
	useClick,
	useFocus,
	useHover,
	useInteractions,
} from '@floating-ui/react'
import { useEffect, useMemo, useRef } from 'react'
import { useFloatingDisclosure, useHasHover } from '../../hooks'
import { subscribeOverlaySignal } from '../../primitives/overlay'
import type { Step } from '../../recipes'

type TooltipStateOptions = {
	placement?: Placement
	delay?: number
	interactive?: boolean
	enabled?: boolean
	size?: Step
	className?: string
}

/**
 * Whether the floating reference is disabled — either the reference node itself
 * matches `:disabled` (the trigger cloned onto a `<button>` switched off by its
 * own `disabled` attribute or an ancestor `<fieldset disabled>`) or a disabled
 * control sits inside it (the wrapper-`<div>` fallback). `querySelector` scans
 * descendants only and misses the reference-is-the-control case, so `matches`
 * has to cover it.
 */
function isReferenceDisabled(reference: unknown): boolean {
	return (
		reference instanceof Element &&
		(reference.matches(':disabled') || reference.querySelector(':disabled') !== null)
	)
}

export function useTooltipState({
	placement = 'top',
	delay = 250,
	interactive = false,
	enabled = true,
	size,
	className,
}: TooltipStateOptions) {
	const { open, setOpen, refs, floatingStyles, context, dismiss, role } = useFloatingDisclosure({
		role: 'tooltip',
		placement,
		offset: 8,
		gate: (next, gateRefs) => {
			if (next && !enabled) return false

			if (next && isReferenceDisabled(gateRefs.reference.current)) return false

			return true
		},
	})

	const prevEnabledRef = useRef(enabled)
	if (prevEnabledRef.current && !enabled && open) {
		setOpen(false)
	}
	prevEnabledRef.current = enabled

	const wasDisabledRef = useRef(false)

	// Polls the reference node and its subtree for the `:disabled` pseudo-class
	// after every render. The `:disabled` state can be set by the reference's own
	// `disabled` attribute, a child `disabled` attribute, an ancestor
	// `<fieldset disabled>`, or an external wrapper — none of which emit a React
	// signal. A post-render effect fires alongside whatever triggered the change.
	// MutationObserver cannot detect the ancestor-fieldset case.
	useEffect(() => {
		const reference = refs.reference.current

		if (!(reference instanceof Element)) return

		const isDisabled = isReferenceDisabled(reference)

		if (isDisabled && open) {
			setOpen(false)
		} else if (wasDisabledRef.current && !isDisabled && reference.matches(':hover')) {
			setOpen(true)
		}

		wasDisabledRef.current = isDisabled
	})

	useEffect(() => {
		if (!open) return

		return subscribeOverlaySignal(() => setOpen(false))
	}, [open, setOpen])

	const hasHover = useHasHover()

	const hover = useHover(context, {
		enabled: enabled && hasHover,
		delay: { open: delay, close: 100 },
		...(interactive && { handleClose: safePolygon() }),
	})

	const click = useClick(context, { enabled: enabled && !hasHover })

	const focus = useFocus(context, { enabled })

	const { getReferenceProps, getFloatingProps } = useInteractions([
		hover,
		click,
		focus,
		dismiss,
		role,
	])

	return useMemo(
		() => ({
			open,
			interactive,
			enabled,
			size,
			className,
			setReference: refs.setReference,
			setFloating: refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
		}),
		[
			open,
			interactive,
			enabled,
			size,
			className,
			refs.setReference,
			refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
		],
	)
}
