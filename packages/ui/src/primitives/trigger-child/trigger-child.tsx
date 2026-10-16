import {
	cloneElement,
	Fragment,
	isValidElement,
	type MouseEventHandler,
	type ReactElement,
	type ReactNode,
	type Ref,
	type SyntheticEvent,
} from 'react'
import { cn, composeEventHandlers } from '../../core'

/**
 * A single element child that a trigger clones. Its own `ref` (React 19 ref as
 * a prop) merges with the ref of the trigger.
 *
 * @internal
 */
export type TriggerChildElement = ReactElement<
	Record<string, unknown> & {
		className?: string
		'data-slot'?: string
		id?: string
		ref?: Ref<HTMLElement>
	}
>

/**
 * Gives the child of a trigger as an element to clone, or `null` when the
 * trigger must render its own element around the children.
 *
 * A Fragment gives `null`. A Fragment renders no host element, so a clone of
 * it cannot hold the props and the ref of the trigger.
 *
 * @internal
 */
export function triggerChild(children: ReactNode): TriggerChildElement | null {
	if (!isValidElement(children) || children.type === Fragment) return null

	return children as TriggerChildElement
}

/**
 * The props of a cloned child, with the other props of the trigger merged in.
 * The child wins a clash, as its `className` does. A handler on both runs the
 * handler of the child first, and its `preventDefault()` cancels the other.
 *
 * @internal
 */
export function mergeTriggerProps(
	triggerProps: Record<string, unknown>,
	childProps: Record<string, unknown>,
): Record<string, unknown> {
	if (Object.keys(triggerProps).length === 0) return childProps

	const merged: Record<string, unknown> = { ...triggerProps, ...childProps }

	for (const [key, triggerValue] of Object.entries(triggerProps)) {
		const childValue = childProps[key]

		if (
			/^on[A-Z]/.test(key) &&
			typeof triggerValue === 'function' &&
			typeof childValue === 'function'
		) {
			merged[key] = composeEventHandlers(
				childValue as (event: SyntheticEvent) => void,
				triggerValue as (event: SyntheticEvent) => void,
			)
		}
	}

	return merged
}

/** Props for {@link TriggerChild}. @internal */
export type TriggerChildProps = {
	/** The child element to clone. */
	child: TriggerChildElement
	/** The props of the trigger. They come after the props of the child. */
	props: Record<string, unknown>
	/** The ref that the clone gets. By default the clone keeps the ref of the child. */
	ref?: Ref<HTMLElement>
	/** The anchor of the trigger. Only a host child that has no `data-slot` gets it. */
	slot?: string
	/** The classes of the trigger. The `className` of the child comes after them, so the child wins a clash. */
	className?: string
}

/**
 * Clones the child of a trigger with the props of the trigger. The props of
 * the child go first, and the props of the trigger come after them. Thus the
 * trigger props must already include the child handlers that they replace.
 * The `ref`, the `slot`, and the `className` come last.
 *
 * The trigger writes its `slot` only on a host element child, such as a
 * `<button>`, that has no `data-slot` of its own. A component child, such as
 * a `<Button>`, keeps the anchor that it writes for itself. The key stays out
 * of the props of a component child, because an undefined value also
 * overrides an anchor that the component writes before its spread.
 *
 * @internal
 */
export function TriggerChild({ child, props, ref, slot, className }: TriggerChildProps) {
	// The clone renders the child's type through JSX, not through `cloneElement`.
	// The React Compiler rejects a ref passed to a function during render.
	const Child = child.type

	const mergedClassName = cn(className, child.props.className)

	return (
		<Child
			key={child.key}
			{...child.props}
			{...props}
			{...(ref !== undefined && { ref })}
			{...(slot !== undefined &&
				typeof Child === 'string' && { 'data-slot': child.props['data-slot'] ?? slot })}
			{...(mergedClassName !== '' && { className: mergedClassName })}
		/>
	)
}

/**
 * Clones a single child, so that a click on it also runs `action`. The
 * `onClick` of the child runs first, and `action` runs also when the child
 * calls `preventDefault()`. `props` go on the clone after the merged `onClick`.
 *
 * A close or clear part, such as `PopoverClose`, lends its action to the child
 * with this, and leaves the rest of the child as it is.
 *
 * @internal
 */
export function cloneWithAction(
	child: ReactElement<{ onClick?: MouseEventHandler }>,
	action: () => void,
	props?: Record<string, unknown>,
): ReactElement {
	return cloneElement(child, {
		onClick: composeEventHandlers(child.props.onClick, action, {
			checkForDefaultPrevented: false,
		}),
		...props,
	})
}
