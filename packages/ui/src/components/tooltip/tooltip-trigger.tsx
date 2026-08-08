'use client'

import {
	cloneElement,
	type HTMLAttributes,
	isValidElement,
	type ReactElement,
	type ReactNode,
	type Ref,
	type RefAttributes,
} from 'react'
import { cn } from '../../core'
import { useFloatingReference } from '../../hooks/use-floating-reference'
import { k } from '../../recipes/kata/tooltip'
import { useTooltipContext } from './context'

/** Props for {@link TooltipTrigger}. */
export type TooltipTriggerProps = {
	/**
	 * The element the tooltip describes. A single valid element receives the
	 * floating ref and interaction props directly; anything else is wrapped in
	 * a `<div>`.
	 */
	children: ReactNode
}

/**
 * Wires the floating reference onto the trigger. When `children` is an element,
 * the trigger clones the reference props (focus/hover/click handlers + the
 * `useRole` tooltip `aria-describedby`) and ref onto that element rather than
 * a wrapping `<div>`; keyboard focus reaches the trigger and the description
 * announces on the focusable node itself (WCAG 2.1.1 / 1.4.13 / 4.1.2).
 *
 * The child's own ref merges with the floating ref. The non-element fallback
 * renders a plain `<div>`; a `<button>` fallback nested inside interactive
 * content is invalid markup.
 *
 * @remarks The clone also stamps `k.trigger` (`inline-flex`) on the child, ahead
 * of the child's own `className` — so a child that needs a different display box
 * restates it and wins the merge. A truncating child needs exactly that: an
 * ellipsis paints against a block box, not a flex container, which is why every
 * truncating trigger in the library carries `block` (`k.cell.truncate`,
 * `k.head.title`, the date-picker `value` recipe, the chart header and legend).
 * Reversing the merge order would silently drop the ellipsis at all of them.
 */
export function TooltipTrigger({ children }: TooltipTriggerProps) {
	const { setReference, getReferenceProps, enabled } = useTooltipContext()

	const child = isValidElement(children)
		? (children as ReactElement<
				HTMLAttributes<HTMLElement> &
					RefAttributes<HTMLElement> & { [key: `data-${string}`]: string | undefined }
			>)
		: null

	const childRef = (child?.props as { ref?: Ref<HTMLElement> } | undefined)?.ref

	const mergeRefs = useFloatingReference<HTMLElement>(setReference, childRef)

	const triggerClassName = cn(k.trigger, enabled && k.cursor)

	if (child) {
		return cloneElement(child, {
			...(getReferenceProps(child.props as Record<string, unknown>) as HTMLAttributes<HTMLElement>),
			ref: mergeRefs,
			// Preserves a child's own `data-slot` (e.g. `time-ago`); falls back to
			// the generic trigger marker only when the child has none.
			'data-slot': child.props['data-slot'] ?? 'tooltip-trigger',
			className: cn(triggerClassName, child.props.className),
		})
	}

	return (
		<div
			ref={mergeRefs}
			data-slot="tooltip-trigger"
			className={triggerClassName}
			{...(getReferenceProps() as HTMLAttributes<HTMLDivElement>)}
		>
			{children}
		</div>
	)
}
