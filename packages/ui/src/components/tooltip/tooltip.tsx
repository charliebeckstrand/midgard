'use client'

import {
	FloatingPortal,
	type Placement,
	safePolygon,
	useClick,
	useDismiss,
	useFocus,
	useHover,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import {
	type HTMLAttributes,
	isValidElement,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { cn } from '../../core'
import { useFloatingPanel, useHasHover } from '../../hooks'
import { ugoki } from '../../recipes'
import { k } from './variants'

export type TooltipProps = {
	placement?: Placement
	delay?: number
	interactive?: boolean
	children: ReactNode
}

export type TooltipTriggerProps = {
	children: ReactNode
}

export type TooltipContentProps = {
	className?: string
	children: ReactNode
}

export function Tooltip({
	placement = 'top',
	delay = 250,
	interactive = false,
	children,
}: TooltipProps) {
	const [open, setOpen] = useState(false)

	const { trigger, contentClassName, contentChildren } = useMemo(() => {
		const arr = Array.isArray(children) ? children : [children]

		let trigger: ReactNode = null
		let contentClassName: string | undefined
		let contentChildren: ReactNode = null

		for (const child of arr) {
			if (!isValidElement(child)) continue

			if (child.type === TooltipTrigger) {
				trigger = child
			} else if (child.type === TooltipContent) {
				const contentProps = child.props as TooltipContentProps

				contentClassName = contentProps.className
				contentChildren = contentProps.children
			}
		}

		return { trigger, contentClassName, contentChildren }
	}, [children])

	const { refs, floatingStyles, context } = useFloatingPanel({
		placement,
		open,
		onOpenChange: (next) => {
			const reference = refs.reference.current

			if (next && reference instanceof Element && reference.querySelector(':disabled')) return

			setOpen(next)
		},
		offset: 8,
	})

	const wasDisabledRef = useRef(false)

	useEffect(() => {
		const reference = refs.reference.current

		if (!(reference instanceof Element)) return

		const isDisabled = !!reference.querySelector(':disabled')

		if (wasDisabledRef.current && !isDisabled && reference.matches(':hover')) {
			setOpen(true)
		}

		wasDisabledRef.current = isDisabled
	})

	const hasHover = useHasHover()

	const hover = useHover(context, {
		enabled: hasHover,
		delay: { open: delay, close: 100 },
		...(interactive && { handleClose: safePolygon() }),
	})

	const click = useClick(context, { enabled: !hasHover })

	const focus = useFocus(context)

	const dismiss = useDismiss(context)

	const role = useRole(context, { role: 'tooltip' })

	const { getReferenceProps, getFloatingProps } = useInteractions([
		hover,
		click,
		focus,
		dismiss,
		role,
	])

	return (
		<div
			ref={refs.setReference}
			data-slot="tooltip"
			className={k.trigger}
			{...(getReferenceProps() as HTMLAttributes<HTMLDivElement>)}
		>
			{trigger}
			<FloatingPortal>
				<AnimatePresence>
					{open && (
						<div
							ref={refs.setFloating}
							style={{
								...floatingStyles,
								pointerEvents: interactive ? 'auto' : 'none',
							}}
							{...getFloatingProps()}
						>
							<motion.div
								{...ugoki.tooltip}
								className={cn(k.content, interactive && 'pointer-events-auto', contentClassName)}
							>
								{contentChildren}
							</motion.div>
						</div>
					)}
				</AnimatePresence>
			</FloatingPortal>
		</div>
	)
}

export function TooltipTrigger({ children }: TooltipTriggerProps) {
	if (isValidElement(children)) {
		return children
	}

	return <span>{children}</span>
}

export function TooltipContent(_props: TooltipContentProps) {
	return null
}
