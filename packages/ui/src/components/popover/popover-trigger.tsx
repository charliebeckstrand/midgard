'use client'

import { useComposedRefs } from 'motion/react'
import { type ComponentProps, type Ref, type SyntheticEvent, useCallback } from 'react'
import { cn, composeEventHandlers } from '../../core'
import { useDeferredFloatingReference } from '../../hooks/use-deferred-floating-reference'
import {
	disclosureProps,
	mergeTriggerProps,
	TriggerChild,
	triggerChild,
} from '../../primitives/trigger-child/trigger-child'
import { k } from '../../recipes/kata/popover'
import { usePopoverContext } from './context'

/**
 * Props for {@link PopoverTrigger}. The `<button>` of the trigger takes the rest.
 * With a single element child, the clone of the child takes the rest instead.
 */
export type PopoverTriggerProps = ComponentProps<'button'>

/**
 * Disclosure trigger for {@link Popover}. Clones a single child element to
 * adopt the floating reference ref and toggle interactions, or renders its own
 * `<button>` otherwise, stamping `aria-haspopup="dialog"`, `aria-expanded`, and
 * `aria-controls`. A {@link PopoverContent} with no accessible name is not a
 * dialog, so the trigger then omits `aria-haspopup`. The trigger stamps
 * `data-open` while the popover is open, and `data-disabled` while it is disabled.
 *
 * A press within a `[data-popover-ignore]` subtree inside the trigger does not
 * toggle the popover. The handlers of the child still run. An ignored element
 * on the trigger itself, or around it, has no effect.
 *
 * The trigger writes `data-slot="popover-trigger"` only on a host element child,
 * such as a `<button>`, that has no `data-slot` of its own. A component child,
 * such as a `<Button>`, keeps the anchor that it writes for itself. The
 * `className` of a cloned child comes after the `className` of the trigger, so
 * the child wins a clash. The other props of the trigger go to a cloned child
 * too. The props of the child win a clash, and a handler on both runs the two.
 */
export function PopoverTrigger({ children, className, ref, ...props }: PopoverTriggerProps) {
	const { open, panelId, dialog, triggerRef, setReference, getReferenceProps } = usePopoverContext()

	const child = triggerChild(children)

	// Merges the child's own ref (React 19 ref-as-prop) with the floating
	// reference; both receive the node.
	// A consumer `ref` on the trigger joins the ref of the child.
	const childRef = useComposedRefs<HTMLElement>(
		child?.props.ref,
		ref as Ref<HTMLElement> | undefined,
	)

	// Registration waits for the first open, so a closed popover renders once
	// rather than twice. `Popover` wires `useClick`, and its outside-press is
	// armed on `open`, so nothing binds to the node while it is shut. `useClick`
	// does read a typeable node on Space, so the hook registers that node at
	// mount. The fan-out is measured in
	// `__benchmarks__/browser/popover-mount.bench.tsx`.
	const setTrigger = useDeferredFloatingReference<HTMLElement>(
		setReference,
		open,
		triggerRef,
		childRef,
	)

	// A match counts only below the trigger. The trigger itself and its
	// ancestors do not count, so an ignored ancestor does not block the toggle.
	const shouldIgnore = useCallback((event: SyntheticEvent<HTMLElement>): boolean => {
		const { target, currentTarget } = event

		if (!(target instanceof Element)) return false

		const match = target.closest('[data-popover-ignore]')

		return match !== null && match !== currentTarget && currentTarget.contains(match)
	}, [])

	// Only the `on*` handlers of the popover gain the ignore guard. Each handler
	// of the child with the same key runs first, outside the guard. The toggle is
	// the activation of the trigger, so `preventDefault()` in the child does not
	// cancel it (CONVENTIONS.md §3.9).
	const wrapReferenceProps = useCallback(
		(childProps?: Record<string, unknown>): Record<string, unknown> =>
			Object.fromEntries(
				Object.entries(getReferenceProps()).map(([key, value]) => {
					if (!/^on[A-Z]/.test(key) || typeof value !== 'function') return [key, value]

					const guarded = (event: SyntheticEvent<HTMLElement>) => {
						if (!shouldIgnore(event)) value(event)
					}

					const theirs = childProps?.[key]

					return [
						key,
						typeof theirs === 'function'
							? composeEventHandlers(
									theirs as (event: SyntheticEvent<HTMLElement>) => void,
									guarded,
									{
										checkForDefaultPrevented: false,
									},
								)
							: guarded,
					]
				}),
			),
		[getReferenceProps, shouldIgnore],
	)

	if (child) {
		const childProps = mergeTriggerProps(props, child.props)

		return (
			<TriggerChild
				child={child}
				props={{
					...childProps,
					...wrapReferenceProps(childProps),
					...disclosureProps(open, panelId, dialog ? 'dialog' : undefined, childProps),
				}}
				ref={setTrigger}
				slot="popover-trigger"
				className={cn(k.trigger, className)}
			/>
		)
	}

	return (
		<button
			data-slot="popover-trigger"
			{...props}
			{...wrapReferenceProps(props)}
			ref={setTrigger}
			type="button"
			{...disclosureProps(open, panelId, dialog ? 'dialog' : undefined, props)}
			className={cn(k.trigger, className)}
		>
			{children}
		</button>
	)
}
