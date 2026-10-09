'use client'

import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../core'
import { useFloatingReference } from '../../hooks/use-floating-reference'
import { TriggerChild, triggerChild } from '../../primitives/trigger-child/trigger-child'
import { k } from '../../recipes/kata/tooltip'
import { useTooltipContext } from './context'

/** Props for {@link TooltipTrigger}. */
export type TooltipTriggerProps = {
	/**
	 * The element the tooltip describes. A single valid element receives the
	 * floating ref and interaction props directly; anything else is wrapped in
	 * a `<span>`. The `<span>` is not focusable, so a tooltip on a non-element
	 * child opens on a pointer hover only. Give a focusable
	 * element child for keyboard access.
	 */
	children: ReactNode
}

/**
 * Wires the floating reference onto the trigger. When `children` is an element,
 * the trigger clones the reference props and ref onto that element rather than
 * a wrapping `<span>`. Those props are the focus/hover/click handlers plus the
 * `useRole` tooltip `aria-describedby`. Keyboard focus reaches the trigger, and
 * the description announces on the focusable node itself (WCAG 2.1.1 / 1.4.13 / 4.1.2).
 * Before the tooltip state loads, the trigger takes no props from it. Native
 * listeners on the node record the first hover, focus, or click, and the
 * state replays that intent when it takes over (see {@link Tooltip}).
 *
 * When the panel is a dialog (an `interactive` panel that holds a tabbable
 * control), the trigger carries `aria-haspopup="dialog"`, `aria-expanded`, and
 * `aria-controls` in place of `aria-describedby`. The trigger also names the
 * dialog. It keeps its own `id` for that, or takes a generated one.
 *
 * The trigger writes `data-slot="tooltip-trigger"` only on a host element child,
 * such as a `<button>`, that has no `data-slot` of its own. A component child,
 * such as a `<Button>`, keeps the anchor that it writes for itself.
 *
 * The child's own ref merges with the floating ref. The non-element fallback
 * renders a plain `<span>`, which is valid in phrasing content. A `<button>`
 * fallback nested inside interactive content is invalid markup. The fallback
 * takes no focus, so its tooltip opens on a pointer hover only.
 *
 * @remarks The clone also stamps `k.trigger.base` (`inline-flex`) on the child,
 * ahead of the child's own `className`. A child that needs a different display box
 * therefore restates it and wins the merge. A truncating child needs exactly
 * that. An ellipsis paints against a block box, not a flex container. Every
 * truncating trigger in the library therefore carries `block`: `k.cell.truncate`,
 * `k.head.title`, the date-picker `value` recipe, the chart header and legend.
 * Reversing the merge order would silently drop the ellipsis at all of them.
 */
export function TooltipTrigger({ children }: TooltipTriggerProps) {
	const { setReference, getReferenceProps, enabled, triggerId } = useTooltipContext()

	const child = triggerChild(children)

	const childRef = child?.props.ref

	// No trigger ref of its own: the tooltip reads its reference through
	// floating-ui alone.
	const mergeRefs = useFloatingReference<HTMLElement>(setReference, undefined, childRef)

	const triggerClassName = cn(k.trigger.base, enabled && k.trigger.cursor)

	if (child) {
		return (
			<TriggerChild
				child={child}
				props={{ ...getReferenceProps(child.props), id: child.props.id ?? triggerId }}
				ref={mergeRefs}
				slot="tooltip-trigger"
				className={triggerClassName}
			/>
		)
	}

	return (
		<span
			ref={mergeRefs}
			id={triggerId}
			data-slot="tooltip-trigger"
			className={triggerClassName}
			{...(getReferenceProps() as ComponentProps<'span'>)}
		>
			{children}
		</span>
	)
}
