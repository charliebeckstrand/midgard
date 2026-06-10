'use client'

import { motion } from 'motion/react'
import type { ReactNode, RefObject } from 'react'
import { cn } from '../../core'
import { useA11yPanel } from '../../hooks'
import { Overlay } from '../../primitives/overlay'
import { PanelProviders } from '../../primitives/panel'
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
	/**
	 * Modal sheets (the default) trap focus, move it into the panel on open,
	 * lock body scroll, and dim the page behind a blocking backdrop. Pass
	 * `false` for transient, pointer-driven surfaces (e.g. a hover-revealed
	 * peek) that must not steal focus or block the page: no backdrop renders
	 * and the page behind stays interactive; Escape or a pointer press outside
	 * the panel dismisses.
	 */
	modal?: boolean
	/**
	 * Accessible name for sheets without a visible `SheetTitle`. Ignored once a
	 * `SheetTitle` registers.
	 */
	'aria-label'?: string
}

/**
 * Edge-anchored overlay panel sliding in from `side`; controlled via
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
	modal,
	'aria-label': ariaLabel,
}: SheetProps) {
	const resolvedSurface = useResolvedSurface(surface, glass)

	const { ariaProps, a11y } = useA11yPanel('dialog', modal ?? true)

	return (
		<Overlay
			open={open}
			onOpenChange={onOpenChange}
			container={container}
			initialFocus={initialFocus}
			modal={modal}
			className={k.backdrop({ surface: resolvedSurface })}
		>
			<motion.div
				{...k.motion[side]}
				{...ariaProps}
				aria-label={ariaProps['aria-labelledby'] ? undefined : ariaLabel}
				data-slot="sheet"
				onClick={(e) => e.stopPropagation()}
				className={cn(
					k.panel({ side, size, surface: resolvedSurface }),
					// Non-modal overlays disable pointer events on the full-viewport
					// wrapper so the page stays interactive; the panel re-enables its own.
					modal === false && 'pointer-events-auto',
					className,
				)}
			>
				<PanelProviders onOpenChange={onOpenChange} a11y={a11y}>
					{children}
				</PanelProviders>
			</motion.div>
		</Overlay>
	)
}
