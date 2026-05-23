'use client'

import { motion } from 'motion/react'
import type { ReactNode, RefObject } from 'react'
import { cn } from '../../core'
import { Overlay } from '../../primitives/overlay'
import {
	PanelA11yProvider,
	PanelCloseProvider,
	usePanelA11yScope,
	usePanelCloseValue,
} from '../../primitives/panel'
import { k, type SheetPanelVariants } from '../../recipes/kata/sheet'
import { useResolvedSurface } from '../glass/context'

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
	const resolvedSurface = useResolvedSurface(surface, glass)

	const { panelAriaProps, providerValue } = usePanelA11yScope()

	const closeValue = usePanelCloseValue(onOpenChange)

	return (
		<Overlay
			open={open}
			onOpenChange={onOpenChange}
			container={container}
			initialFocus={initialFocus}
			className={k.backdrop({ surface: resolvedSurface })}
		>
			<motion.div
				{...k.motion[side]}
				{...panelAriaProps}
				data-slot="sheet"
				onClick={(e) => e.stopPropagation()}
				className={cn(k.panel({ side, size, surface: resolvedSurface }), className)}
			>
				<PanelCloseProvider value={closeValue}>
					<PanelA11yProvider value={providerValue}>{children}</PanelA11yProvider>
				</PanelCloseProvider>
			</motion.div>
		</Overlay>
	)
}
