'use client'

import { type ReactNode, useLayoutEffect, useState } from 'react'
import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import { useA11yAutoFocus } from '../../hooks'
import { FloatingSurface } from '../../primitives/floating-surface'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import { useResolvedSurface } from '../../providers/glass/context'
import { k, type scale } from '../../recipes/kata/popover'
import { Box } from '../../structure/box'
import { usePopoverContext, usePopoverPosition } from './context'

/** Props for {@link PopoverContent}: focus behavior (`autoFocus`/`modal`), `size`, and the accessible name. */
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
	/**
	 * Opt the surface into the translucent glass chrome, as the panel family
	 * does. An ambient `<GlassProvider>` already turns it on; this is the
	 * per-surface opt-in for a tree that has none. Set `false` to keep the flat
	 * surface inside a `<GlassProvider>`.
	 *
	 * @defaultValue `false`, or the flag of the enclosing `<GlassProvider>`.
	 */
	glass?: boolean
	/**
	 * The density step of the panel and its content. Omit it to take the step
	 * of the nearest density scope of the trigger, which the portal carries. A
	 * step makes the panel a density scope.
	 */
	size?: ScaleStep<typeof scale>
	/**
	 * Accessible name for the surface. When provided (or `aria-labelledby`), the
	 * content renders as a **non-modal** `role="dialog"` without `aria-modal`;
	 * focus is not trapped. Omit both to render it as an unlabeled generic
	 * surface, and the trigger then omits `aria-haspopup`.
	 */
	'aria-label'?: string
	'aria-labelledby'?: string
	children: ReactNode
}

/**
 * The floating surface. Non-modal by default: a non-modal focus manager puts
 * the panel in the tab order right after the trigger. Tab goes from the
 * trigger into the panel and from the panel on into the page, an outside
 * press dismisses it, and focus returns to the trigger on close. `autoFocus` moves initial focus into the panel on
 * open; `modal` traps focus inside it. Use `Dialog` for page-level modal
 * content.
 */
export function PopoverContent({
	className,
	autoFocus = false,
	modal = false,
	size,
	glass: glassProp,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
	children,
}: PopoverContentProps) {
	const { open, panelId, setDialog, setFloating, getFloatingProps } = usePopoverContext()

	const dialog = Boolean(ariaLabel || ariaLabelledby)

	// The trigger reads the role through the context, so its `aria-haspopup`
	// names a dialog only when the panel is one.
	useLayoutEffect(() => {
		setDialog(dialog)

		return () => setDialog(true)
	}, [dialog, setDialog])

	const { floatingStyles, floatingContext } = usePopoverPosition()

	// State, not a ref: the panel attaches inside its portal a commit after `open`
	// flips, and the auto-focus effect must run again when it arrives.
	const [content, setContent] = useState<HTMLDivElement | null>(null)

	const glass = useResolvedSurface(glassProp) === 'glass'

	useA11yAutoFocus(content, open && autoFocus)

	return (
		<FloatingSurface
			open={open}
			density={size}
			setFloating={setFloating}
			floatingStyles={floatingStyles}
			getFloatingProps={getFloatingProps}
			// Mounted for every panel, so `modal` changes only the trap. A non-modal
			// manager makes the portal draw its tab-order guards: Tab goes from the
			// trigger into the panel and from the panel on to the next element after
			// the trigger.
			trapFocusContext={floatingContext}
			trapFocusProps={{ modal }}
		>
			<m.div
				{...k.panel.motion}
				ref={setContent}
				id={panelId}
				tabIndex={autoFocus ? -1 : undefined}
				role={dialog ? 'dialog' : undefined}
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledby}
				data-slot="popover-content"
				className={cn(k.text, glass && k.panel.glass)}
			>
				<Box
					bg={glass ? 'none' : 'popover'}
					radius="lg"
					outline={glass || undefined}
					className={cn(k.padding, className)}
				>
					{children}
				</Box>
			</m.div>
		</FloatingSurface>
	)
}
