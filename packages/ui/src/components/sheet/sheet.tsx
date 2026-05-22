'use client'

import { motion } from 'motion/react'
import { type ReactNode, type RefObject, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { Overlay } from '../../primitives/overlay'
import { PanelA11yProvider, usePanelA11yScope } from '../../primitives/panel'
import { k, type SheetPanelVariants } from '../../recipes/kata/sheet'
import { useResolvedSurface } from '../glass/context'
import { SheetProvider } from './context'

export type SheetProps = SheetPanelVariants & {
	open: boolean
	onOpenChange: (open: boolean) => void
	glass?: boolean
	className?: string
	children: ReactNode
	/**
	 * Optional element to portal into. When provided, the sheet is scoped to this
	 * element (rendered with `absolute` positioning, no body scroll lock). The
	 * container must establish a positioning context (e.g. `position: relative`).
	 * Defaults to `document.body` with full-viewport `fixed` positioning.
	 */
	container?: HTMLElement | null
	/** Element to receive initial focus when the sheet opens. Defaults to the first tabbable child. */
	initialFocus?: RefObject<HTMLElement | null>
}

export function Sheet({
	open,
	onOpenChange,
	side = 'right',
	size,
	surface,
	glass,
	className,
	children,
	container,
	initialFocus,
}: SheetProps) {
	const resolvedSide = side ?? 'right'

	const resolvedSurface = useResolvedSurface(surface, glass)

	const { panelAriaProps, providerValue } = usePanelA11yScope()

	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	const contextValue = useMemo(() => ({ close }), [close])

	return (
		<Overlay
			open={open}
			onOpenChange={onOpenChange}
			container={container}
			initialFocus={initialFocus}
			className={k.backdrop({ surface: resolvedSurface })}
		>
			<motion.div
				{...k.motion[resolvedSide]}
				{...panelAriaProps}
				data-slot="sheet"
				onClick={(e) => e.stopPropagation()}
				className={cn(k.panel({ side, size, surface: resolvedSurface }), className)}
			>
				<SheetProvider value={contextValue}>
					<PanelA11yProvider value={providerValue}>{children}</PanelA11yProvider>
				</SheetProvider>
			</motion.div>
		</Overlay>
	)
}
