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
import { useDeferredFloatingReference } from '../../hooks/use-floating-reference'
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

	// Registration waits for the first open, so a closed popover renders once
	// rather than twice. `Popover` wires `useClick`, and its outside-press is
	// armed on `open`, so nothing binds to the node while it is shut. `useClick`
	// does read a typeable node on Space, so the hook registers that node at
	// mount. The fan-out is measured in
	// `__benchmarks__/browser/popover-mount.bench.tsx`.
	const mergeRefs = useDeferredFloatingReference<HTMLElement>(
		setReference,
		open,
		triggerRef,
		childRef,
	)

	const shouldIgnore = useCallback((event: SyntheticEvent<HTMLElement>): boolean => {
		return event.target instanceof Element && event.target.closest('[data-popover-ignore]') !== null
	}, [])

	// Every `on*` handler from the reference props gains the ignore guard.
	const wrapReferenceProps = useCallback(
		(props?: Record<string, unknown>): Record<string, unknown> =>
			Object.fromEntries(
				Object.entries(getReferenceProps(props)).map(([key, value]) => [
					key,
					/^on[A-Z]/.test(key) && typeof value === 'function'
						? (event: SyntheticEvent<HTMLElement>) =>
								shouldIgnore(event) ? undefined : value(event)
						: value,
				]),
			),
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
