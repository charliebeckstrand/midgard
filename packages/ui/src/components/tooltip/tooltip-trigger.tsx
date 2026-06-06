'use client'

import {
	cloneElement,
	type HTMLAttributes,
	isValidElement,
	type ReactElement,
	type ReactNode,
	type Ref,
	type RefAttributes,
	useCallback,
} from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/tooltip'
import { useTooltipContext } from './context'

export type TooltipTriggerProps = {
	children: ReactNode
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
	if (typeof ref === 'function') ref(node)
	else if (ref != null) (ref as { current: T | null }).current = node
}

/**
 * Wires the floating reference onto the trigger. When `children` is an element,
 * the reference props (focus/hover/click handlers + the `useRole` tooltip
 * `aria-describedby`) and ref are cloned **onto that element** rather than a
 * wrapping `<div>`, so keyboard focus reaches the trigger and the description is
 * announced against the focusable node itself (WCAG 2.1.1 / 1.4.13 / 4.1.2).
 *
 * Mirrors `PopoverTrigger`, with two deliberate differences: the child's own ref
 * is merged (not overwritten) since triggers like the date-picker's truncation
 * span pass one, and the non-element fallback stays a plain `<div>` — tooltip
 * triggers are frequently nested inside other interactive content (e.g. the
 * date-picker button), where a focusable `<button>` fallback would be invalid.
 */
export function TooltipTrigger({ children }: TooltipTriggerProps) {
	const { setReference, getReferenceProps, enabled, className } = useTooltipContext()

	const child = isValidElement(children)
		? (children as ReactElement<
				HTMLAttributes<HTMLElement> &
					RefAttributes<HTMLElement> & { [key: `data-${string}`]: string | undefined }
			>)
		: null

	const childRef = (child?.props as { ref?: Ref<HTMLElement> } | undefined)?.ref

	const mergeRefs = useCallback(
		(node: HTMLElement | null) => {
			setReference(node)
			assignRef(childRef, node)
		},
		[setReference, childRef],
	)

	const triggerClassName = cn(k.trigger, enabled && k.cursor, className)

	if (child) {
		return cloneElement(child, {
			...(getReferenceProps(child.props as Record<string, unknown>) as HTMLAttributes<HTMLElement>),
			ref: mergeRefs,
			'data-slot': 'tooltip-trigger',
			className: cn(triggerClassName, child.props.className),
		})
	}

	return (
		<div
			ref={setReference}
			data-slot="tooltip-trigger"
			className={triggerClassName}
			{...(getReferenceProps() as HTMLAttributes<HTMLDivElement>)}
		>
			{children}
		</div>
	)
}
