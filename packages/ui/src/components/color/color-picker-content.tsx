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
	/** Re-broadcast through `<Density>`; the portal renders the panel outside the trigger's cascade. */
	size: ControlSize
	children: ReactNode
}

/**
 * Portals the picker panel into a focus-managed, animated floating dialog
 * positioned by Floating UI, re-broadcasting `size` through `<Density>` and
 * adopting glass styling from context.
 *
 * @remarks
 * Mounts only while `open`; {@link https://floating-ui.com | Floating UI}
 * supplies `floatingStyles` and the dismiss/role props. `returnFocus={false}`
 * on the focus manager defers focus restoration to `useFloatingUI`'s
 * `returnFocusTo`, so Escape returns focus to the trigger while an
 * outside-press lets focus follow the pointer.
 *
 * @internal
 */
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
						// `returnFocus={false}`: `useFloatingUI`'s `returnFocusTo` restores
						// focus on Escape but not on an outside-press dismiss, where focus
						// follows the pointer.
						<FloatingFocusManager context={context} modal returnFocus={false}>
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
									data-size={size}
									className={cn('z-50', k.content.text, glass && k.content.glass)}
									onMouseDown={(event) => event.preventDefault()}
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
