'use client'

import { type ReactNode, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks'
import type { Mount } from '../../primitives/mount'
import { type AccordionVariants, k } from '../../recipes/kata/accordion'
import { AccordionContext } from './context'
import {
	type MultipleProps,
	type SingleProps,
	useAccordionSelection,
} from './use-accordion-selection'

/**
 * Props for {@link Accordion}. The `type` discriminant selects single- vs
 * multiple-open semantics and the matching `value`/`defaultValue`/`onValueChange`
 * shapes.
 */
export type AccordionProps = (SingleProps | MultipleProps) &
	AccordionVariants & {
		/**
		 * How item panels are held while closed.
		 *
		 * @remarks
		 * Defaults to `active` — a closed panel is unmounted, so reopening it
		 * resets whatever state it held. `always` mounts every panel up front and
		 * `lazy` mounts each on its first open; either way a closed panel then
		 * rests in `<Activity mode="hidden">` with its state preserved and effects
		 * torn down. Prefer `lazy` over `always` for a long accordion: `always`
		 * pays every panel's first render before any of them is opened.
		 *
		 * @defaultValue 'active'
		 */
		mount?: Mount
		className?: string
		children: ReactNode
	}

/**
 * Vertically stacked set of collapsible sections. `type='single'` keeps at
 * most one open (optionally `collapsible` to none); `type='multiple'` allows
 * any number. Controlled via `value`/`onValueChange` or uncontrolled. `variant`
 * defaults to `'separated'`.
 *
 * @remarks
 * Triggers share a roving tabindex: Arrow keys move focus between enabled header
 * buttons, skipping disabled ones. The container carries no ARIA role, per the
 * WAI-ARIA accordion pattern.
 *
 * @see {@link AccordionItem}
 * @see {@link AccordionTrigger}
 * @see {@link AccordionPanel}
 */
export function Accordion(props: AccordionProps) {
	const { variant, mount = 'active', className, children } = props

	const { isOpen, toggle } = useAccordionSelection(props)

	const context = useMemo(
		() => ({ variant: variant ?? 'separated', mount, isOpen, toggle }),
		[variant, mount, isOpen, toggle],
	)

	const ref = useRef<HTMLDivElement>(null)

	const handleKeyDown = useA11yRoving(ref, {
		itemSelector: '[data-slot="accordion-trigger"]:not(:disabled)',
	})

	return (
		<AccordionContext value={context}>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: the WAI-ARIA accordion pattern defines no role for the container; the roving tabindex handler must live here to navigate between header buttons */}
			<div
				ref={ref}
				data-slot="accordion"
				className={cn(k({ variant }), className)}
				onKeyDown={handleKeyDown}
			>
				{children}
			</div>
		</AccordionContext>
	)
}
