'use client'

import {
	cloneElement,
	type HTMLAttributes,
	isValidElement,
	type ReactElement,
	type ReactNode,
	type RefAttributes,
	type SyntheticEvent,
	useCallback,
} from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/popover'
import { usePopoverContext } from './popover'

export type PopoverTriggerProps = {
	children: ReactNode
	className?: string
	manual?: boolean
}

export function PopoverTrigger({ children, className, manual = false }: PopoverTriggerProps) {
	const { open, triggerRef, setReference, getReferenceProps } = usePopoverContext()

	// Return a cleanup from the ref callback so React 19 won't call it with
	// null on unmount. That avoids `setReference(null)` firing a state update
	// during deletion effects, which can otherwise cascade into a "Maximum
	// update depth" error when ancestor state is still in flux.
	const mergeRefs = useCallback(
		(node: HTMLElement | null) => {
			triggerRef.current = node as HTMLButtonElement | null

			setReference(node)

			return () => {
				triggerRef.current = null
			}
		},
		[triggerRef, setReference],
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

	if (isValidElement(children)) {
		const child = children as ReactElement<
			HTMLAttributes<HTMLElement> &
				RefAttributes<HTMLElement> & { [key: `data-${string}`]: string | undefined }
		>
		const referenceProps = manual
			? child.props
			: wrapReferenceProps(child.props as Record<string, unknown>)

		return cloneElement(child, {
			...(referenceProps as HTMLAttributes<HTMLElement>),
			ref: mergeRefs,
			'aria-haspopup': 'dialog',
			'aria-expanded': open,
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
			data-slot="popover-trigger"
			className={cn(k.trigger, className)}
		>
			{children}
		</button>
	)
}
