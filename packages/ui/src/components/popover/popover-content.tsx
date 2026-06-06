'use client'

import { motion } from 'motion/react'
import { type ReactNode, useRef } from 'react'
import { cn } from '../../core'
import { useA11yAutoFocus } from '../../hooks'
import { Density, useDensity } from '../../primitives/density'
import { FloatingSurface } from '../../primitives/floating-surface'
import { useGlass } from '../../providers/glass/context'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/popover'
import { Box, type BoxPadding } from '../box'
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
	/**
	 * Accessible name for the surface. When provided (or `aria-labelledby`), the
	 * content is exposed as a **non-modal** `role="dialog"` — matching the
	 * trigger's `aria-haspopup="dialog"`, but without `aria-modal`, so focus is
	 * never trapped. Omit both to leave it an unlabelled generic surface and
	 * avoid an unnamed-dialog violation.
	 */
	'aria-label'?: string
	'aria-labelledby'?: string
	children: ReactNode
}

/**
 * The floating surface. Non-modal by design: it renders through
 * `FloatingSurface` (not a focus manager), so Tab is not trapped — it moves
 * through the panel and out into the page, an outside press dismisses it, and
 * focus returns to the trigger on close. `autoFocus` moves initial focus into
 * the panel on open. Use `Dialog` when the content must contain focus.
 */
export function PopoverContent({
	className,
	autoFocus = false,
	p,
	size,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
	children,
}: PopoverContentProps) {
	const { open, setFloating, floatingStyles, getFloatingProps, onExitComplete } =
		usePopoverContext()

	const contentRef = useRef<HTMLDivElement | null>(null)

	const glass = useGlass()
	const inherited = useDensity()

	const resolvedSize = size ?? inherited.size

	const resolvedPadding: BoxPadding = p ?? paddingForSize[resolvedSize]

	useA11yAutoFocus(contentRef, open && autoFocus)

	return (
		<FloatingSurface
			open={open}
			setFloating={setFloating}
			floatingStyles={floatingStyles}
			getFloatingProps={getFloatingProps}
			onExitComplete={onExitComplete}
		>
			<motion.div
				{...k.panel.motion}
				ref={contentRef}
				tabIndex={autoFocus ? -1 : undefined}
				role={ariaLabel || ariaLabelledby ? 'dialog' : undefined}
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledby}
				data-slot="popover-content"
				data-density={resolvedSize}
				className={cn(k.text, glass && k.panel.glass)}
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
		</FloatingSurface>
	)
}
