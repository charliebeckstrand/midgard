'use client'

import { FloatingFocusManager, FloatingPortal, type FloatingRootContext } from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../../core'
import { Density } from '../../primitives/density'
import { usePortalContainer } from '../../primitives/portal'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { useGlass } from '../../providers/glass/context'
import { k } from '../../recipes/kata/color-picker'
import { Box } from '../box'
import type { ControlSize } from '../control/context'

type ColorPickerContentProps = {
	open: boolean
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: CSSProperties
	getFloatingProps: () => Record<string, unknown>
	context: FloatingRootContext
	/** Re-broadcast through `<Density>` because the portal teleports the panel out of the trigger's cascade. */
	size: ControlSize
	children: ReactNode
}

export function ColorPickerContent({
	open,
	setFloating,
	floatingStyles,
	getFloatingProps,
	context,
	size,
	children,
}: ColorPickerContentProps) {
	const glass = useGlass()

	const root = usePortalContainer()

	return (
		<FloatingPortal root={root ?? undefined}>
			<ReducedMotion>
				<AnimatePresence>
					{open && (
						<FloatingFocusManager context={context} modal>
							<div
								ref={setFloating}
								role="dialog"
								aria-modal="true"
								aria-label="Choose color"
								style={floatingStyles}
								className={k.content.portal}
								tabIndex={-1}
								{...getFloatingProps()}
							>
								<motion.div
									{...k.content.motion}
									data-slot="color-picker-content"
									data-density={size}
									className={cn('z-50', k.content.text, glass && k.content.glass)}
									onMouseDown={(e) => e.preventDefault()}
								>
									<Density scale={size}>
										<Box
											bg={glass ? 'none' : 'popover'}
											outline={glass || undefined}
											radius="lg"
											p="md"
										>
											{children}
										</Box>
									</Density>
								</motion.div>
							</div>
						</FloatingFocusManager>
					)}
				</AnimatePresence>
			</ReducedMotion>
		</FloatingPortal>
	)
}
