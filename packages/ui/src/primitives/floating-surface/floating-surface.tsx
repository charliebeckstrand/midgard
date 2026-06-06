'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence } from 'motion/react'
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/popover'
import { usePortalContainer } from '../portal'
import { ReducedMotion } from '../reduced-motion'

export type FloatingSurfaceProps = {
	open: boolean
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: CSSProperties
	getFloatingProps: (userProps?: object) => Record<string, unknown>
	onExitComplete?: () => void
	className?: string
	style?: CSSProperties
	children: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className' | 'style' | 'ref'>

/**
 * Portal + presence + positioning shell shared by Tooltip, Popover, and
 * Menu surfaces. Owns the `FloatingPortal`, `AnimatePresence`, and the
 * positioned wrapper that receives the floating-ui reference; consumers
 * render the animated inner surface as `children`.
 */
export function FloatingSurface({
	open,
	setFloating,
	floatingStyles,
	getFloatingProps,
	onExitComplete,
	className,
	style,
	children,
	...rest
}: FloatingSurfaceProps) {
	const root = usePortalContainer()

	return (
		<FloatingPortal root={root ?? undefined}>
			<ReducedMotion>
				<AnimatePresence onExitComplete={onExitComplete}>
					{open && (
						<div
							ref={setFloating}
							style={style ? { ...floatingStyles, ...style } : floatingStyles}
							className={cn(k.portal, className)}
							{...rest}
							{...getFloatingProps()}
						>
							{children}
						</div>
					)}
				</AnimatePresence>
			</ReducedMotion>
		</FloatingPortal>
	)
}
