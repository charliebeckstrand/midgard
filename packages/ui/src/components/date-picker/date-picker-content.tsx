'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import { type CSSProperties, type ReactNode, type Ref, useMemo } from 'react'

import { cn } from '../../core'
import { ConcentricProvider, ReducedMotion } from '../../primitives'
import { iro, omote, ugoki } from '../../recipes'
import { popover as kPopover } from '../../recipes/kata/popover'
import type { Step } from '../../recipes/ryu/sun'
import { Box } from '../box'
import type { ControlSize } from '../control/context'
import { useGlass } from '../glass/context'

export type DatePickerContentProps = {
	open: boolean
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: CSSProperties
	getFloatingProps: () => Record<string, unknown>
	focusTrapRef: Ref<HTMLDivElement>
	/**
	 * Resolved size from `<DatePicker>`. Re-broadcast via `<ConcentricProvider>`
	 * because the FloatingPortal teleports out of the concentric chain — without
	 * this, `<Calendar>` and `<DatePickerFooter>` inside would fall back to
	 * `'md'` even when the trigger renders at `sm` / `lg`.
	 */
	size: ControlSize
	onExitComplete?: () => void
	children: ReactNode
}

export function DatePickerContent({
	open,
	setFloating,
	floatingStyles,
	getFloatingProps,
	focusTrapRef,
	size,
	onExitComplete,
	children,
}: DatePickerContentProps) {
	const glass = useGlass()

	const concentricValue = useMemo<{ size: Step }>(() => ({ size }), [size])

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
								data-step={size}
								className={cn('z-50', iro.text.default, glass && omote.glass)}
								onMouseDown={(e) => e.preventDefault()}
							>
								<ConcentricProvider value={concentricValue}>
									<Box bg={glass ? 'none' : 'popover'} outline={glass || undefined} radius="lg">
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
