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
 * the trigger clones the reference props (focus/hover/click handlers + the
 * `useRole` tooltip `aria-describedby`) and ref onto that element rather than
 * a wrapping `<div>`; keyboard focus reaches the trigger and the description
 * announces on the focusable node itself (WCAG 2.1.1 / 1.4.13 / 4.1.2).
 *
 * The child's own ref merges with the floating ref. The non-element fallback
 * renders a plain `<div>`; a `<button>` fallback nested inside interactive
 * content is invalid markup.
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

	// React 19 skips the null call on unmount when the ref callback returns a
	// cleanup. `setReference(null)` during deletion effects fires a state
	// update that can cascade into a "Maximum update depth" error while
	// ancestor state is in flux.
	const mergeRefs = useCallback(
		(node: HTMLElement | null) => {
			setReference(node)
			assignRef(childRef, node)

			return () => {
				assignRef(childRef, null)
			}
		},
		[setReference, childRef],
	)

	const triggerClassName = cn(k.trigger, enabled && k.cursor, className)

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
			ref={setReference}
			data-slot="tooltip-trigger"
			className={triggerClassName}
			{...(getReferenceProps() as HTMLAttributes<HTMLDivElement>)}
		>
			{children}
		</div>
	)
}
