'use client'

import { type ReactNode, type SyntheticEvent, useCallback } from 'react'
import { cn } from '../../core'
import { useDeferredFloatingReference } from '../../hooks/use-deferred-floating-reference'
import { TriggerChild, triggerChild } from '../../primitives/trigger-child/trigger-child'
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
 * `aria-controls`. A {@link PopoverContent} with no accessible name is not a
 * dialog, so the trigger then omits `aria-haspopup`. Clicks within a `[data-popover-ignore]` subtree are ignored.
 *
 * The trigger writes `data-slot="popover-trigger"` only on a host element child,
 * such as a `<button>`, that has no `data-slot` of its own. A component child,
 * such as a `<Button>`, keeps the anchor that it writes for itself. The
 * `className` of a cloned child comes after the `className` of the trigger, so
 * the child wins a clash.
 */
export function PopoverTrigger({ children, className }: PopoverTriggerProps) {
	const { open, panelId, dialog, triggerRef, setReference, getReferenceProps } = usePopoverContext()

	const child = triggerChild(children)

	// Merges the child's own ref (React 19 ref-as-prop) with the floating
	// reference; both receive the node.
	const childRef = child?.props.ref

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
		return (
			<TriggerChild
				child={child}
				props={{
					...wrapReferenceProps(child.props),
					'aria-haspopup': dialog ? 'dialog' : undefined,
					'aria-expanded': open,
					'aria-controls': open ? panelId : undefined,
				}}
				ref={mergeRefs}
				slot="popover-trigger"
				className={cn(k.trigger, className)}
			/>
		)
	}

	const referenceProps = wrapReferenceProps()

	return (
		<button
			{...referenceProps}
			ref={mergeRefs}
			type="button"
			aria-haspopup={dialog ? 'dialog' : undefined}
			aria-expanded={open}
			aria-controls={open ? panelId : undefined}
			data-slot="popover-trigger"
			className={cn(k.trigger, className)}
		>
			{children}
		</button>
	)
}
