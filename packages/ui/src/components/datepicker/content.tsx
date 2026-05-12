'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import type { CSSProperties, ReactNode, Ref } from 'react'

import { cn } from '../../core'
import { ReducedMotion } from '../../primitives'
import { iro, omote, ugoki } from '../../recipes'
import { popover as kPopover } from '../../recipes/kata/popover'
import { Box } from '../box'
import { useGlass } from '../glass/context'

export type DatePickerContentProps = {
	open: boolean
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: CSSProperties
	getFloatingProps: () => Record<string, unknown>
	focusTrapRef: Ref<HTMLDivElement>
	onExitComplete?: () => void
	children: ReactNode
}

export function DatePickerContent({
	open,
	setFloating,
	floatingStyles,
	getFloatingProps,
	focusTrapRef,
	onExitComplete,
	children,
}: DatePickerContentProps) {
	const glass = useGlass()

	return (
		<FloatingPortal>
			<ReducedMotion>
				<AnimatePresence onExitComplete={onExitComplete}>
					{open && (
						<div
							ref={setFloating}
							style={floatingStyles}
							className={kPopover.portal}
							tabIndex={-1}
							{...getFloatingProps()}
						>
							<motion.div
								ref={focusTrapRef}
								{...ugoki.popover}
								data-slot="datepicker-content"
								className={cn('z-50', iro.text.default, glass && omote.glass)}
								onMouseDown={(e) => e.preventDefault()}
							>
								<Box bg={glass ? 'none' : 'popover'} outline={glass || undefined} radius="lg">
									{children}
								</Box>
							</motion.div>
						</div>
					)}
				</AnimatePresence>
			</ReducedMotion>
		</FloatingPortal>
	)
}
