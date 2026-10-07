/**
 * How an owner of a value binds a control that it gets as an element. The
 * owner reads this marker from the element type, so it does not import the
 * control to compare identity.
 *
 * - `text`: the control reads `value` and calls `onChange` with a DOM event.
 * - `search`: as `text`, and its `onClear` clears the value.
 * - `toggle`: the control reads `checked` as a boolean and calls `onChange`.
 * - `option`: the control is checked when its own `value` matches, and it
 *   writes that `value` through `onChange`.
 *
 * A type with no marker reads `value` and calls `onValueChange` with the value.
 *
 * @internal
 */
export type ControlBinding = 'text' | 'search' | 'toggle' | 'option'

const BINDING = Symbol('control.binding')

type Marked = { [BINDING]?: ControlBinding }

/**
 * Sets the binding marker of `component`. Call it once, after the declaration
 * of the component.
 *
 * @internal
 */
export function markControlBinding(component: object, binding: ControlBinding): void {
	;(component as Marked)[BINDING] = binding
}

/**
 * The binding marker of an element type, or `undefined` when the type has no
 * marker.
 *
 * @internal
 */
export function controlBinding(type: unknown): ControlBinding | undefined {
	return typeof type === 'function' ? (type as Marked)[BINDING] : undefined
}
