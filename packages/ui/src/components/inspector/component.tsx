'use client'

import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { useCallback, useMemo } from 'react'
import { cn, createContext } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { PanelA11yProvider, useDescriptionRegistration } from '../../primitives'
import { type InspectorPanelVariants, inspectorPanelVariants } from './variants'

const SIZE_PX = { sm: 320, md: 384, lg: 448, xl: 512 } as const

type InspectorSize = keyof typeof SIZE_PX

type InspectorContextValue = {
	close: () => void
}

export const [InspectorProvider, useInspectorContext] =
	createContext<InspectorContextValue>('Inspector')

export type InspectorProps = InspectorPanelVariants & {
	open: boolean
	onOpenChange: (open: boolean) => void
	className?: string
	children: React.ReactNode
}

export function Inspector({
	open,
	onOpenChange,
	side = 'right',
	size = 'md',
	className,
	children,
}: InspectorProps) {
	const resolvedSize = (size ?? 'md') as InspectorSize

	const width = SIZE_PX[resolvedSize]

	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	const scope = useIdScope()

	const titleId = scope.sub('title')
	const descriptionId = scope.sub('description')

	const { hasDescription, registerDescription } = useDescriptionRegistration()

	const a11yValue = useMemo(
		() => ({ titleId, descriptionId, registerDescription }),
		[titleId, descriptionId, registerDescription],
	)

	const contextValue = useMemo<InspectorContextValue>(() => ({ close }), [close])

	return (
		<AnimatePresence initial={false}>
			{open && (
				<motion.aside
					initial={{ width: 0 }}
					animate={{ width }}
					exit={{ width: 0 }}
					transition={{ duration: 0.2, ease: [0.3, 0.1, 0.3, 1] }}
					data-slot="inspector"
					aria-labelledby={titleId}
					aria-describedby={hasDescription ? descriptionId : undefined}
					className={cn('shrink-0 overflow-hidden', className)}
				>
					<div className={cn(inspectorPanelVariants({ side, size }))}>
						<InspectorProvider value={contextValue}>
							<PanelA11yProvider value={a11yValue}>{children}</PanelA11yProvider>
						</InspectorProvider>
					</div>
				</motion.aside>
			)}
		</AnimatePresence>
	)
}
