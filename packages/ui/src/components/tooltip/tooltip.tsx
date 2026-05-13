'use client'

import {
	type Placement,
	safePolygon,
	useClick,
	useDismiss,
	useFocus,
	useHover,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { createContext } from '../../core'
import { useFloatingPanel, useHasHover } from '../../hooks'

type TooltipContextValue = {
	open: boolean
	interactive: boolean
	enabled: boolean
	className?: string
	setReference: (node: HTMLElement | null) => void
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: CSSProperties
	getReferenceProps: (userProps?: object) => Record<string, unknown>
	getFloatingProps: (userProps?: object) => Record<string, unknown>
}

const [TooltipProvider, useTooltipContext] = createContext<TooltipContextValue>('Tooltip')

export { useTooltipContext }

export type TooltipProps = {
	placement?: Placement
	delay?: number
	interactive?: boolean
	enabled?: boolean
	className?: string
	children: ReactNode
}

export function Tooltip({
	placement = 'top',
	delay = 250,
	interactive = false,
	enabled = true,
	className,
	children,
}: TooltipProps) {
	const [open, setOpen] = useState(false)

	const { refs, floatingStyles, context } = useFloatingPanel({
		placement,
		open,
		onOpenChange: (next) => {
			if (next && !enabled) return

			const reference = refs.reference.current

			if (next && reference instanceof Element && reference.querySelector(':disabled')) return

			setOpen(next)
		},
		offset: 8,
	})

	useEffect(() => {
		if (!enabled && open) setOpen(false)
	}, [enabled, open])

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

	const hasHover = useHasHover()

	const hover = useHover(context, {
		enabled: enabled && hasHover,
		delay: { open: delay, close: 100 },
		...(interactive && { handleClose: safePolygon() }),
	})

	const click = useClick(context, { enabled: enabled && !hasHover })

	const focus = useFocus(context, { enabled })

	const dismiss = useDismiss(context)

	const role = useRole(context, { role: 'tooltip' })

	const { getReferenceProps, getFloatingProps } = useInteractions([
		hover,
		click,
		focus,
		dismiss,
		role,
	])

	const contextValue = useMemo<TooltipContextValue>(
		() => ({
			open,
			interactive,
			enabled,
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
			className,
			refs.setReference,
			refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
		],
	)

	return <TooltipProvider value={contextValue}>{children}</TooltipProvider>
}
