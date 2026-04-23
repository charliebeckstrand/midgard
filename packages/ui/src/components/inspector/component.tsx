'use client'

import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useCallback, useMemo } from 'react'
import { cn, createContext } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { PanelA11yProvider, useDescriptionRegistration } from '../../primitives'
import { ugoki } from '../../recipes'
import { type InspectorPanelVariants, inspectorPanelVariants } from './variants'

// ---------------------------------------------------------------------------
// Layout wrapper — flex container that pushes content off-screen
// ---------------------------------------------------------------------------

export type InspectorContentProps = {
	side?: 'left' | 'right'
	className?: string
	children: ReactNode
}

export function InspectorContent({ side = 'right', className, children }: InspectorContentProps) {
	return (
		<div
			data-slot="inspector-content"
			className={cn(
				'flex overflow-hidden',
				'[&>:not([data-slot=inspector])]:min-w-full',
				side === 'right' && 'justify-end',
				className,
			)}
		>
			{children}
		</div>
	)
}

// ---------------------------------------------------------------------------
// Panel-level context (close action)
// ---------------------------------------------------------------------------

type InspectorPanelContextValue = {
	close: () => void
}

export const [InspectorPanelProvider, useInspectorContext] =
	createContext<InspectorPanelContextValue>('Inspector')

// ---------------------------------------------------------------------------
// Inspector panel
// ---------------------------------------------------------------------------

export type InspectorProps = InspectorPanelVariants & {
	open: boolean
	onOpenChange: (open: boolean) => void
	className?: string
	children: ReactNode
}

export function Inspector({
	open,
	onOpenChange,
	side = 'right',
	size = 'md',
	className,
	children,
}: InspectorProps) {
	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	const scope = useIdScope()

	const titleId = scope.sub('title')

	const descriptionId = scope.sub('description')

	const { hasDescription, registerDescription } = useDescriptionRegistration()

	const a11yValue = useMemo(
		() => ({ titleId, descriptionId, registerDescription }),
		[titleId, descriptionId, registerDescription],
	)

	const contextValue = useMemo<InspectorPanelContextValue>(() => ({ close }), [close])

	const ariaProps = {
		'aria-labelledby': titleId,
		'aria-describedby': hasDescription ? descriptionId : undefined,
	}

	return (
		<AnimatePresence initial={false}>
			{open && (
				<motion.aside
					{...ugoki.inspector}
					{...ariaProps}
					data-slot="inspector"
					className={cn('shrink-0 overflow-hidden', className)}
				>
					<div className={cn(inspectorPanelVariants({ side, size }))}>
						<InspectorPanelProvider value={contextValue}>
							<PanelA11yProvider value={a11yValue}>{children}</PanelA11yProvider>
						</InspectorPanelProvider>
					</div>
				</motion.aside>
			)}
		</AnimatePresence>
	)
}
