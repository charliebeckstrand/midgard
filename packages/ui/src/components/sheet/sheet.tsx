'use client'

import { motion } from 'motion/react'
import type { ReactNode, RefObject } from 'react'
import { cn } from '../../core'
import { useA11yPanel } from '../../hooks'
import { Overlay } from '../../primitives/overlay'
import { PanelA11yContext, PanelCloseContext, usePanelCloseValue } from '../../primitives/panel'
import { useResolvedSurface } from '../../providers/glass/context'
import { k, type SheetPanelVariants } from '../../recipes/kata/sheet'

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

/**
 * Edge-anchored overlay panel sliding in from `side` — controlled via
 * `open`/`onOpenChange`. Portals to `document.body` by default, or scopes to a
 * `container` with absolute positioning and no scroll lock.
 */
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

	const { panelAriaProps, providerValue } = useA11yPanel()

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
				<PanelCloseContext value={closeValue}>
					<PanelA11yContext value={providerValue}>{children}</PanelA11yContext>
				</PanelCloseContext>
			</motion.div>
		</Overlay>
	)
}
