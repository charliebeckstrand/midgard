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

export type PopoverTriggerProps = {
	children: ReactNode
	className?: string
	manual?: boolean
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
	if (typeof ref === 'function') ref(node)
	else if (ref != null) (ref as { current: T | null }).current = node
}

export function PopoverTrigger({ children, className, manual = false }: PopoverTriggerProps) {
	const { open, panelId, triggerRef, setReference, getReferenceProps } = usePopoverContext()

	const child = isValidElement(children)
		? (children as ReactElement<
				HTMLAttributes<HTMLElement> &
					RefAttributes<HTMLElement> & { [key: `data-${string}`]: string | undefined }
			>)
		: null

	// The child's own ref is merged (not overwritten) to support triggers that
	// pass one (React 19 ref-as-prop), so a consumer's `ref` still receives the
	// node instead of being clobbered by the floating reference.
	const childRef = (child?.props as { ref?: Ref<HTMLElement> } | undefined)?.ref

	// Returns a cleanup from the ref callback so React 19 does not call it with
	// null on unmount. This prevents `setReference(null)` from firing a state
	// update during deletion effects, which can cascade into a "Maximum update
	// depth" error when ancestor state is still in flux.
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
