'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useLayoutEffect, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { ConcentricProvider, ReducedMotion, useConcentric } from '../../primitives'
import { iro, omote, ugoki } from '../../recipes'
import { k } from '../../recipes/kata/popover'
import type { Step } from '../../recipes/ryu/sun'
import { Box, type BoxPadding } from '../box'
import { useGlass } from '../glass/context'
import { usePopoverContext } from './popover'

// Surface padding scales with the resolved concentric size. Consumers can still
// override per-instance via the `p` prop.
const paddingForSize: Record<Step, BoxPadding> = { sm: 'md', md: 'lg', lg: 'xl' }

export type PopoverContentProps = {
	className?: string
	autoFocus?: boolean
	p?: BoxPadding
	/**
	 * Size step that propagates to descendants via the concentric context.
	 * Resolution order: explicit prop, then enclosing concentric size, then `'md'`.
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

	const ambient = useConcentric()

	const resolvedSize = size ?? ambient?.size ?? 'md'

	const resolvedPadding: BoxPadding = p ?? paddingForSize[resolvedSize]

	const concentricValue = useMemo(() => ({ size: resolvedSize }), [resolvedSize])

	useLayoutEffect(() => {
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
								<ConcentricProvider value={concentricValue}>
									<Box
										p={resolvedPadding}
										bg={glass ? 'none' : 'popover'}
										radius="lg"
										outline={glass || undefined}
										className={className}
									>
										{children}
									</Box>
								</ConcentricProvider>
							</motion.div>
						</div>
					)}
				</AnimatePresence>
			</ReducedMotion>
		</FloatingPortal>
	)
}
