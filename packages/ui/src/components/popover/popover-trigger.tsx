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
	useLayoutEffect,
	useRef,
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

	// The node the engine anchors to, stashed rather than handed over at mount.
	// A closed popover has no use for a reference: positioning, `autoUpdate`,
	// the escape layer, and outside-press all begin at the open. Registration at
	// mount instead renders every closed popover on the page twice, because
	// `setReference` is a state setter and the ref callback calls it during the
	// commit. `MenuTrigger` defers it for the same reason, and the fan-out is
	// measured in `__benchmarks__/browser/popover-mount.bench.tsx`.
	const referenceNode = useRef<HTMLElement | null>(null)

	// Set once the engine holds a reference, after which a node swap forwards at
	// once rather than waiting for another open — the behaviour registration at
	// mount gave for free.
	const registered = useRef(false)

	const captureReference = useCallback(
		(node: HTMLElement | null) => {
			referenceNode.current = node

			if (registered.current) setReference(node)
		},
		[setReference],
	)

	const mergeRefs = useFloatingReference<HTMLElement>(captureReference, triggerRef, childRef)

	// A layout effect, not a passive one: it runs in the commit that mounts the
	// panel, so the engine has its reference before that commit paints. The
	// panel is therefore placed in the frame it first appears in.
	useLayoutEffect(() => {
		if (!open) return

		registered.current = true

		setReference(referenceNode.current)
	}, [open, setReference])

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
