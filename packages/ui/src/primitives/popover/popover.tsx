'use client'

import { motion } from 'motion/react'
import { type KeyboardEventHandler, type ReactNode, useLayoutEffect, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving, useScrollWithin } from '../../hooks'
import { k } from '../../recipes/kata/popover'
import { ReducedMotion } from '../reduced-motion'

export function PopoverPanel({
	id,
	className,
	children,
	role = 'listbox',
	itemSelector = '[role="option"]:not([data-disabled])',
	autoFocus = true,
	typeahead = false,
	glass = false,
	multiselectable,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
	onKeyDown: onKeyDownProp,
}: {
	id?: string
	className?: string
	children: ReactNode
	role?: string
	itemSelector?: string
	autoFocus?: boolean
	/** Enable WAI-ARIA type-ahead: jump to the item whose label matches typed keys. */
	typeahead?: boolean
	/** Apply glass surface chrome instead of the default popover surface. */
	glass?: boolean
	/** Sets `aria-multiselectable` on a `role="listbox"` panel that allows multiple selections. */
	multiselectable?: boolean
	/** Accessible name for the panel's role (e.g. the listbox), threaded from the owning control. */
	'aria-label'?: string
	'aria-labelledby'?: string
	onKeyDown?: KeyboardEventHandler
}) {
	const panelRef = useRef<HTMLDivElement>(null)

	const handleKeyDown = useA11yRoving(panelRef, { itemSelector, focusOnEmpty: true, typeahead })

	const scrollWithin = useScrollWithin()

	useLayoutEffect(() => {
		if (!autoFocus || !panelRef.current) return

		const selected = panelRef.current.querySelector<HTMLElement>(`${itemSelector}[data-selected]`)

		if (selected) {
			selected.focus()

			scrollWithin(selected, { block: 'nearest' })
		} else {
			panelRef.current.focus()
		}
	}, [autoFocus, itemSelector, scrollWithin])

	return (
		<ReducedMotion>
			<motion.div
				ref={panelRef}
				id={id}
				data-slot="popover-panel"
				role={role}
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledby}
				// aria-multiselectable: only set on `listbox` (and a few grid-like roles).
				aria-multiselectable={role === 'listbox' ? multiselectable : undefined}
				tabIndex={-1}
				{...k.panel.motion}
				onKeyDown={(event) => {
					handleKeyDown(event)
					onKeyDownProp?.(event)
				}}
				className={cn(
					glass ? ['group/glass', k.panel.glass, k.panel.ring] : k.panel.surface,
					k.panel.base,
					className,
				)}
			>
				{children}
			</motion.div>
		</ReducedMotion>
	)
}
