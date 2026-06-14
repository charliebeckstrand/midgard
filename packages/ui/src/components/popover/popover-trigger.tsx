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
import { k } from '../../recipes/kata/popover'
import { usePopoverContext } from './context'

/** Props for {@link PopoverTrigger}. */
export type PopoverTriggerProps = {
	children: ReactNode
	className?: string
	/**
	 * Suppresses the auto-wired toggle interactions, leaving open/close control
	 * to the caller while still merging refs and ARIA wiring.
	 * @defaultValue false
	 */
	manual?: boolean
}

/**
 * Writes a node into a callback or object ref, tolerating either form.
 *
 * @internal
 */
function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
	if (typeof ref === 'function') ref(node)
	else if (ref != null) (ref as { current: T | null }).current = node
}

/**
 * Disclosure trigger for {@link Popover}. Clones a single child element to
 * adopt the floating reference ref and toggle interactions, or renders its own
 * `<button>` otherwise, stamping `aria-haspopup="dialog"`, `aria-expanded`, and
 * `aria-controls`. Clicks within a `[data-popover-ignore]` subtree are ignored.
 */
export function PopoverTrigger({ children, className, manual = false }: PopoverTriggerProps) {
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

	// React 19 skips the null call on unmount when the ref callback returns a
	// cleanup. `setReference(null)` during deletion effects fires a state
	// update that can cascade into a "Maximum update depth" error while
	// ancestor state is in flux.
	const mergeRefs = useCallback(
		(node: HTMLElement | null) => {
			triggerRef.current = node as HTMLButtonElement | null

			setReference(node)
			assignRef(childRef, node)

			return () => {
				triggerRef.current = null
				assignRef(childRef, null)
			}
		},
		[triggerRef, setReference, childRef],
	)

	const shouldIgnore = useCallback((e: SyntheticEvent<HTMLElement>): boolean => {
		return e.target instanceof Element && e.target.closest('[data-popover-ignore]') !== null
	}, [])

	const wrapReferenceProps = useCallback(
		(props?: Record<string, unknown>) => {
			const refProps = getReferenceProps(props)

			const eventKeys = Object.keys(refProps).filter((key) => /^on[A-Z]/.test(key))

			const wrapped: Record<string, unknown> = { ...refProps }

			for (const key of eventKeys) {
				const original = refProps[key]

				if (typeof original === 'function') {
					wrapped[key] = (e: SyntheticEvent<HTMLElement>) => {
						if (shouldIgnore(e)) return

						return original(e)
					}
				}
			}

			return wrapped
		},
		[getReferenceProps, shouldIgnore],
	)

	if (child) {
		const referenceProps = manual
			? child.props
			: wrapReferenceProps(child.props as Record<string, unknown>)

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

	const referenceProps = manual ? {} : wrapReferenceProps()

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
