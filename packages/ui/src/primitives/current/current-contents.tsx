'use client'

import { motion } from 'motion/react'
import { type ComponentPropsWithoutRef, useRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/current'
import { ReducedMotion } from '../reduced-motion'
import { CurrentFadeProvider } from './current'
import { useCurrentContentsHeight } from './use-current-contents-height'

export type CurrentContentsProps = ComponentPropsWithoutRef<'div'> & {
	/** Slot prefix used to stamp `data-slot="<slotPrefix>-contents"` and pair with `CurrentContent` siblings. */
	slotPrefix: string
	/** Animate height between active panels. Default true. */
	fade?: boolean
}

/**
 * Outer container for the current-panel cascade. When `fade` is true, animates
 * height between the active `CurrentContent` and the surrounding box, and
 * signals its `CurrentContent` children to fade in place. When `fade` is false,
 * renders a plain wrapper and lets `CurrentContent` unmount unmatched children.
 */
export function CurrentContents({
	slotPrefix,
	fade = true,
	className,
	children,
	...props
}: CurrentContentsProps) {
	const containerRef = useRef<HTMLDivElement>(null)

	const height = useCurrentContentsHeight(containerRef, fade)

	if (!fade) {
		return (
			<div data-slot={`${slotPrefix}-contents`} className={className} {...props}>
				{children}
			</div>
		)
	}

	return (
		<CurrentFadeProvider value>
			<ReducedMotion>
				<motion.div
					ref={containerRef}
					data-slot={`${slotPrefix}-contents`}
					animate={height !== undefined ? { height } : undefined}
					initial={false}
					transition={k.transition}
					className={cn('relative overflow-hidden', className)}
				>
					{children}
				</motion.div>
			</ReducedMotion>
		</CurrentFadeProvider>
	)
}
