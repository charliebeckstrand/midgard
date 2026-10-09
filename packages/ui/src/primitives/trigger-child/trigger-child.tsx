import { isValidElement, type ReactElement, type ReactNode, type Ref } from 'react'
import { cn } from '../../core'

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
 * @internal
 */
export function triggerChild(children: ReactNode): TriggerChildElement | null {
	return isValidElement(children) ? (children as TriggerChildElement) : null
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
