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
 * The header buttons that the arrow keys move between: the enabled triggers of
 * this accordion. `:scope` is the root that the roving hook queries from. A nested
 * accordion is in a panel and moves between its own headers, so the query leaves
 * out each trigger in a nested root. A closed panel under `always` or `lazy` keeps
 * its nested root in the DOM but hidden. A move to a hidden button leaves the focus
 * where it was, so the arrow keys could not pass that item.
 */
const TRIGGER_SELECTOR =
	'[data-slot="accordion-trigger"]:not(:disabled):not(:scope [data-slot="accordion"] *)'

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
		 * Whether each open panel is a `region` landmark, named by its header button.
		 *
		 * @remarks
		 * A region helps a short accordion, where the panels are the main parts of
		 * the page. Each panel adds one landmark, so set it to `false` for an
		 * accordion of more than about six panels, or for one inside a page that has
		 * its own landmarks for these parts. The panels then have no role and no name,
		 * and the header buttons keep their `aria-controls`.
		 *
		 * @defaultValue true
		 */
		region?: boolean
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
		region = true,
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

	const ref = useRef<HTMLDivElement>(null)

	// Each header button runs the handler. The container has no role in the
	// WAI-ARIA accordion pattern, so it takes no key handler. The handler finds
	// the buttons in the container.
	const handleTriggerKeyDown = useA11yRoving(ref, { itemSelector: TRIGGER_SELECTOR })

	const context = useMemo(
		() => ({
			variant: variant ?? 'separated',
			mount,
			region,
			openStore,
			toggle,
			onOpenComplete: reportOpenComplete,
			onTriggerKeyDown: handleTriggerKeyDown,
		}),
		[variant, mount, region, openStore, toggle, reportOpenComplete, handleTriggerKeyDown],
	)

	return (
		<AccordionContext value={context}>
			<div {...rest} ref={ref} data-slot="accordion" className={cn(k({ variant }), className)}>
				{children}
			</div>
		</AccordionContext>
	)
}
