'use client'

import type { FloatingRootContext } from '@floating-ui/react'
import { motion } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { FloatingSurface, type FloatingSurfaceProps } from '../../primitives/floating-surface'
import { useGlass } from '../../providers/glass/context'
import { k } from '../../recipes/kata/color-picker'
import { Box } from '../../structure/box'

type ColorPickerContentProps = {
	open: boolean
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: CSSProperties
	getFloatingProps: FloatingSurfaceProps['getFloatingProps']
	context: FloatingRootContext
	/** The explicit size step. A step makes the panel a density scope. Without it, the panel takes the step of the scope that the portal carries. */
	size?: DensityStep
	children: ReactNode
}

/**
 * Portals the picker panel into a focus-managed, animated floating dialog
 * positioned by Floating UI. An explicit `size` makes the panel a density scope,
 * and the panel adopts glass styling from context.
 *
 * @remarks
 * Mounts only while `open`; {@link https://floating-ui.com | Floating UI}
 * supplies `floatingStyles` and the dismiss/role props. `returnFocus={false}`
 * on the focus manager defers focus restoration to `useFloatingUI`'s
 * `returnFocusTo`. Escape therefore returns focus to the trigger, while an
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

	return (
		// `returnFocus={false}` in the surface: `useFloatingUI`'s `returnFocusTo` restores
		// focus on Escape, but not on an outside press, where focus follows the pointer.
		// `initialFocus={0}` seats focus on the first tabbable, the default of the engine
		// that this panel had before it moved onto the surface.
		<FloatingSurface
			open={open}
			density={size}
			setFloating={setFloating}
			floatingStyles={floatingStyles}
			getFloatingProps={getFloatingProps}
			trapFocusContext={context}
			trapFocusProps={{ initialFocus: 0 }}
			role="dialog"
			aria-modal="true"
			aria-label="Choose color"
			className={k.content.portal}
			tabIndex={-1}
		>
			<motion.div
				{...k.content.motion}
				data-slot="color-picker-content"
				className={cn('z-50', k.content.text, glass && k.content.glass)}
				onMouseDown={(event) => event.preventDefault()}
			>
				<Box bg={glass ? 'none' : 'popover'} outline={glass || undefined} radius="lg" p="md">
					{children}
				</Box>
			</motion.div>
		</FloatingSurface>
	)
}
