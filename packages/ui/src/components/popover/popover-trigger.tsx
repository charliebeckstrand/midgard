'use client'

import {
	cloneElement,
	type HTMLAttributes,
	isValidElement,
	type ReactElement,
	type ReactNode,
	type Ref,
	type RefAttributes,
	type SyntheticEvent,
	useCallback,
} from 'react'
import { cn } from '../../core'
import { useFloatingReference } from '../../hooks/use-floating-reference'
import { k } from '../../recipes/kata/popover'
import { usePopoverContext } from './context'

/** Props for {@link PopoverTrigger}. */
export type PopoverTriggerProps = {
	children: ReactNode
	className?: string
}

/**
 * Disclosure trigger for {@link Popover}. Clones a single child element to
 * adopt the floating reference ref and toggle interactions, or renders its own
 * `<button>` otherwise, stamping `aria-haspopup="dialog"`, `aria-expanded`, and
 * `aria-controls`. Clicks within a `[data-popover-ignore]` subtree are ignored.
 */
export function PopoverTrigger({ children, className }: PopoverTriggerProps) {
	const { open, panelId, triggerRef, setReference, getReferenceProps } = usePopoverContext()

	const child = isValidElement(children)
		? (children as ReactElement<
				HTMLAttributes<HTMLElement> &
					RefAttributes<HTMLElement> & { [key: `data-${string}`]: string | undefined }
			>)
		: null

	// Merges the child's own ref (React 19 ref-as-prop) with the floating
	// reference; both receive the node.
	const childRef = (child?.props as { ref?: Ref<HTMLElement> } | undefined)?.ref

	// The cloned child is any element, so the node is an `HTMLElement`. The
	// context types `triggerRef` as a button — true of the fallback `<button>`
	// only — and the cast keeps that narrower declaration.
	const mergeRefs = useFloatingReference<HTMLElement>(
		setReference,
		triggerRef as Ref<HTMLElement>,
		childRef,
	)

	const shouldIgnore = useCallback((event: SyntheticEvent<HTMLElement>): boolean => {
		return event.target instanceof Element && event.target.closest('[data-popover-ignore]') !== null
	}, [])

	const wrapReferenceProps = useCallback(
		(props?: Record<string, unknown>) => {
			const refProps = getReferenceProps(props)

			const eventKeys = Object.keys(refProps).filter((key) => /^on[A-Z]/.test(key))

			const wrapped: Record<string, unknown> = { ...refProps }

			for (const key of eventKeys) {
				const original = refProps[key]

				if (typeof original === 'function') {
					wrapped[key] = (event: SyntheticEvent<HTMLElement>) => {
						if (shouldIgnore(event)) return

						return original(event)
					}
				}
			}

			return wrapped
		},
		[getReferenceProps, shouldIgnore],
	)

	if (child) {
		const referenceProps = wrapReferenceProps(child.props as Record<string, unknown>)

		return cloneElement(child, {
			...(referenceProps as HTMLAttributes<HTMLElement>),
			ref: mergeRefs,
			'aria-haspopup': 'dialog',
			'aria-expanded': open,
			'aria-controls': open ? panelId : undefined,
			'data-slot': 'popover-trigger',
			className: cn(k.trigger, child.props.className, className),
		})
	}

	const referenceProps = wrapReferenceProps()

	return (
		<button
			{...referenceProps}
			ref={mergeRefs}
			type="button"
			aria-haspopup="dialog"
			aria-expanded={open}
			aria-controls={open ? panelId : undefined}
			data-slot="popover-trigger"
			className={cn(k.trigger, className)}
		>
			{children}
		</button>
	)
}
