'use client'

import { type ComponentProps, type ReactNode, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks'
import { useStableEvent } from '../../hooks/use-stable-event'
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
	AccordionVariants &
	Omit<ComponentProps<'div'>, 'className' | 'onKeyDown' | 'value' | 'defaultValue' | 'onChange'> & {
		/**
		 * How item panels are held while closed.
		 *
		 * @remarks
		 * Defaults to `active` — a closed panel is unmounted, so reopening it
		 * resets whatever state it held. `always` mounts every panel up front and
		 * `lazy` mounts each on its first open. Either way a closed panel then
		 * rests in `<Activity mode="hidden">` with its state preserved and effects
		 * torn down. Prefer `lazy` over `always` for a long accordion: `always`
		 * pays every panel's first render before any of them is opened.
		 *
		 * @defaultValue 'active'
		 */
		mount?: Mount
		/**
		 * Fires once a section has finished opening and is at rest, with the `value` of the
		 * section that landed.
		 *
		 * A state change is not an arrival: `onValueChange` reports the flip, and the panel
		 * is still growing when it does. Use this to focus, measure, or start work that
		 * needs the section at its settled height. Never fires for a close, and never for a
		 * section that mounts already open. A `type='single'` swap therefore reports only
		 * the section that opened, not the one it replaced.
		 *
		 * @see {@link DrawerProps.onOpenComplete} for the panel family's form of this callback.
		 */
		onOpenComplete?: (value: string) => void
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
 * Each enabled header button is a Tab stop. Arrow keys also move focus between
 * enabled header buttons, and skip disabled ones. The container carries no ARIA
 * role, per the WAI-ARIA accordion pattern.
 *
 * @see {@link AccordionItem}
 * @see {@link AccordionTrigger}
 * @see {@link AccordionPanel}
 */
export function Accordion(props: AccordionProps) {
	// The selection props come out with the rest of the component's own props.
	// `useAccordionSelection` reads them off `props` whole. One left in the rest
	// reaches the `<div>`: `defaultValue` as the native attribute of that name,
	// and `collapsible` as an invalid one.
	const {
		variant,
		mount = 'active',
		onOpenComplete,
		className,
		children,
		type: _type,
		value: _value,
		defaultValue: _defaultValue,
		onValueChange: _onValueChange,
		collapsible: _collapsible,
		...rest
	} = props

	const { openStore, toggle } = useAccordionSelection(props)

	// A stable event, so the context memo does not key on the caller's callback. That
	// callback would otherwise be the one unstable member, and each item and panel
	// reads the value.
	const reportOpenComplete = useStableEvent((value: string) => {
		onOpenComplete?.(value)
	})

	const context = useMemo(
		() => ({
			variant: variant ?? 'separated',
			mount,
			openStore,
			toggle,
			onOpenComplete: reportOpenComplete,
		}),
		[variant, mount, openStore, toggle, reportOpenComplete],
	)

	const ref = useRef<HTMLDivElement>(null)

	const handleKeyDown = useA11yRoving(ref, {
		itemSelector: '[data-slot="accordion-trigger"]:not(:disabled)',
	})

	return (
		<AccordionContext value={context}>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: the WAI-ARIA accordion pattern defines no role for the container; the arrow-key navigation handler must live here to move focus between header buttons */}
			<div
				{...rest}
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
