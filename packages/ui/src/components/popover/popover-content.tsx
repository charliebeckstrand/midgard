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

// Surface padding scales with the resolved Density size; overridable per-instance via `p`.
const paddingForSize = { sm: 'md', md: 'lg', lg: 'xl' } satisfies Record<Step, BoxPadding>

/** Props for {@link PopoverContent}: focus behavior (`autoFocus`/`modal`), padding/size, and the accessible name. */
export type PopoverContentProps = {
	className?: string
	/**
	 * Moves initial focus into the panel on open.
	 * @defaultValue false
	 */
	autoFocus?: boolean
	/**
	 * Traps focus inside the panel while open (`FloatingFocusManager`): Tab
	 * cycles within it and focus returns to the trigger on close. For panels
	 * that own a complete keyboard surface, e.g. the calendar's month/year
	 * picker.
	 * @defaultValue false
	 */
	modal?: boolean
	p?: BoxPadding
	/**
	 * Size step that propagates to descendants via the Density context.
	 * Resolution order: explicit prop, then enclosing Density size, then `'md'`.
	 */
	size?: Step
	/**
	 * Accessible name for the surface. When provided (or `aria-labelledby`), the
	 * content renders as a **non-modal** `role="dialog"` without `aria-modal`;
	 * focus is not trapped. Omit both to render it as an unlabelled generic
	 * surface.
	 */
	'aria-label'?: string
	'aria-labelledby'?: string
	children: ReactNode
}

/**
 * The floating surface. Non-modal by default: renders through
 * `FloatingSurface` (not a focus manager). Tab moves through the panel and
 * out into the page, an outside press dismisses it, and focus returns to
 * the trigger on close. `autoFocus` moves initial focus into the panel on
 * open; `modal` traps focus inside it. Use `Dialog` for page-level modal
 * content.
 */
export function PopoverContent({
	className,
	autoFocus = false,
	modal = false,
	p,
	size,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
	children,
}: PopoverContentProps) {
	const {
		open,
		panelId,
		setFloating,
		floatingStyles,
		getFloatingProps,
		floatingContext,
		onExitComplete,
	} = usePopoverContext()

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
			trapFocusContext={modal ? floatingContext : undefined}
			onExitComplete={onExitComplete}
		>
			<motion.div
				{...k.panel.motion}
				ref={contentRef}
				id={panelId}
				tabIndex={autoFocus ? -1 : undefined}
				role={ariaLabel || ariaLabelledby ? 'dialog' : undefined}
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledby}
				data-slot="popover-content"
				data-size={resolvedSize}
				className={cn(k.text, glass && k.panel.glass)}
			>
				<Density scale={resolvedSize}>
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
