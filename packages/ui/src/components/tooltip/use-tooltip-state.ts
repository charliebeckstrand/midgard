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

			const reference = gateRefs.reference.current

			if (next && reference instanceof Element && reference.querySelector(':disabled')) return false

			return true
		},
	})

	const prevEnabledRef = useRef(enabled)
	if (prevEnabledRef.current && !enabled && open) {
		setOpen(false)
	}
	prevEnabledRef.current = enabled

	const wasDisabledRef = useRef(false)

	// Polls the reference subtree for the `:disabled` pseudo-class after every
	// render. React has no signal for `:disabled` transitions in descendants —
	// they can flip from a child element's `disabled` attribute, an ancestor
	// <fieldset disabled>, or a wrapper outside this component entirely — so
	// the only correct trigger is "every time we re-render alongside whatever
	// changed it." MutationObserver wouldn't catch the ancestor-fieldset case.
	useEffect(() => {
		const reference = refs.reference.current

		if (!(reference instanceof Element)) return

		const isDisabled = !!reference.querySelector(':disabled')

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
