'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useEffect, useRef } from 'react'
import { cn } from '../../core'
import { Density, useDensity } from '../../primitives/density'
import { ReducedMotion } from '../../primitives/reduced-motion'
import type { Step } from '../../recipes'
import { iro, omote, ugoki } from '../../recipes'
import { k } from '../../recipes/genkei/popover'
import { Box, type BoxPadding } from '../box'
import { useGlass } from '../glass/context'
import { usePopoverContext } from './context'

// Surface padding scales with the resolved Density size. Consumers can still
// override per-instance via the `p` prop.
const paddingForSize: Record<Step, BoxPadding> = { sm: 'md', md: 'lg', lg: 'xl' }

export type PopoverContentProps = {
	className?: string
	autoFocus?: boolean
	p?: BoxPadding
	/**
	 * Size step that propagates to descendants via the Density context.
	 * Resolution order: explicit prop, then enclosing Density size, then `'md'`.
	 */
	size?: Step
	children: ReactNode
}

export function PopoverContent({
	className,
	autoFocus = false,
	p,
	size,
	children,
}: PopoverContentProps) {
	const { open, setFloating, floatingStyles, getFloatingProps, onExitComplete } =
		usePopoverContext()

	const contentRef = useRef<HTMLDivElement | null>(null)

	const glass = useGlass()
	const inherited = useDensity()

	const resolvedSize = size ?? inherited.size

	const resolvedPadding: BoxPadding = p ?? paddingForSize[resolvedSize]

	useEffect(() => {
		if (open && autoFocus) {
			contentRef.current?.focus()
		}
	}, [open, autoFocus])

	return (
		<FloatingPortal>
			<ReducedMotion>
				<AnimatePresence onExitComplete={onExitComplete}>
					{open && (
						<div
							ref={setFloating}
							style={floatingStyles}
							className={k.portal}
							{...getFloatingProps()}
						>
							<motion.div
								{...ugoki.popover}
								ref={contentRef}
								tabIndex={autoFocus ? -1 : undefined}
								data-slot="popover-content"
								data-step={resolvedSize}
								className={cn('z-50', iro.text.default, glass && omote.glass)}
							>
								<Density density={resolvedSize} size={resolvedSize}>
									<Box
										p={resolvedPadding}
										bg={glass ? 'none' : 'popover'}
										radius="lg"
										outline={glass || undefined}
										className={className}
									>
										{children}
									</Box>
								</Density>
							</motion.div>
						</div>
					)}
				</AnimatePresence>
			</ReducedMotion>
		</FloatingPortal>
	)
}
