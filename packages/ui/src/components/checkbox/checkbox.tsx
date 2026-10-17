'use client'

import { Check, Minus } from 'lucide-react'
import { useComposedRefs } from 'motion/react'
import { type ChangeEventHandler, type ComponentProps, useLayoutEffect, useRef } from 'react'
import { ariaAttr, cn, dataAttr } from '../../core'
import { useFormToggle } from '../../primitives/form/use-form-toggle'
import { type CheckboxVariants, k } from '../../recipes/kata/checkbox'
import { useControlProps } from '../control/use-control-props'

/** Props for {@link Checkbox}. */
export type CheckboxProps = CheckboxVariants & {
	/**
	 * Renders the partial tri-state, regardless of `checked`: a minus glyph, a
	 * `data-indeterminate` attribute on the input, and the `indeterminate` DOM property.
	 * @defaultValue false
	 */
	indeterminate?: boolean
	/**
	 * Keeps the state of the box. A click or a Space press does not change it,
	 * and `onChange` does not fire. The box keeps the focus, submits its value,
	 * and sets `aria-readonly`. When omitted, it takes the value of an enclosing
	 * `<Control>` or `<Field>`.
	 * @defaultValue `false`, or the state of the enclosing Control.
	 */
	readOnly?: boolean
} & Omit<ComponentProps<'input'>, 'type' | 'size' | 'readOnly'>

/**
 * Labeled checkbox with an `indeterminate` tri-state. Binds to enclosing Form
 * and Control context for `name` and validation. The box takes the step of the
 * nearest density scope, and an explicit `size` opens a scope on the label. An explicit
 * `checked` prop wins over the bound field; `onChange` fires in either mode.
 * `defaultChecked` reaches the element only while the checkbox is uncontrolled,
 * so a bound checkbox ignores it (§7.2). `className`, `style`, and `hidden` go
 * to the visible box, and the other native attributes go to the input.
 */
export function Checkbox({
	className,
	style,
	hidden,
	color,
	size,
	indeterminate,
	id,
	disabled,
	readOnly,
	required,
	ref,
	name,
	checked,
	defaultChecked,
	onChange,
	'aria-describedby': ariaDescribedBy,
	...props
}: CheckboxProps) {
	const {
		checked: resolvedChecked,
		onChange: resolvedOnChange,
		invalid,
	} = useFormToggle({ name, checked, onChange })

	const {
		id: resolvedId,
		disabled: resolvedDisabled,
		required: resolvedRequired,
		readOnly: resolvedReadOnly,
		validation,
		'aria-describedby': resolvedDescribedBy,
	} = useControlProps({
		name,
		id,
		disabled,
		required,
		readOnly,
		'aria-describedby': ariaDescribedBy,
		invalid,
	})

	const inputRef = useRef<HTMLInputElement>(null)

	const setRef = useComposedRefs(inputRef, ref)

	// `indeterminate` is a DOM property with no attribute; sync it before paint.
	// A server render runs no effect, so the input also carries
	// `data-indeterminate`. The kata keys the fill and the mark on that attribute.
	useLayoutEffect(() => {
		if (inputRef.current) inputRef.current.indeterminate = !!indeterminate
	}, [indeterminate])

	// An activation clears the property. The prop does not change, so the effect
	// does not run again. The wrapper writes the property back, then calls the
	// resolved handler. It attaches only while the prop is true, the box is
	// read-only, or a handler resolves. React then keeps its warning for a
	// `checked` input with no `onChange` in the other cases.
	//
	// A read-only box undoes the toggle and does not call the resolved handler.
	// The write goes through the setter, so the change tracker of React keeps the
	// correct value. A canceled click gets the same undo. React reads the toggle
	// before the browser restores the value, so it sends a change that does not
	// occur. The `onClick` handlers run before this handler, so the click event
	// shows the cancel. Without the undo, React then misses the next change.
	const handleChange: ChangeEventHandler<HTMLInputElement> | undefined =
		indeterminate || resolvedReadOnly || resolvedOnChange
			? (event) => {
					const input = event.currentTarget

					input.indeterminate = !!indeterminate

					if (resolvedReadOnly || event.nativeEvent.defaultPrevented) {
						input.checked = !input.checked

						return
					}

					resolvedOnChange?.(event)
				}
			: undefined

	const Mark = indeterminate ? Minus : Check

	return (
		<label
			data-slot="control"
			data-density={size}
			data-disabled={dataAttr(resolvedDisabled)}
			hidden={hidden}
			style={style}
			className={cn(k({ color }), className)}
		>
			<input
				// Consumer props spread first; the resolved §7.2 binding, the
				// read-only state, the validation attributes, data-slot, and the
				// state that the kata reads take precedence.
				{...props}
				type="checkbox"
				data-slot="checkbox"
				data-indeterminate={dataAttr(indeterminate)}
				ref={setRef}
				id={resolvedId}
				name={name}
				disabled={resolvedDisabled}
				required={resolvedRequired}
				checked={resolvedChecked}
				defaultChecked={resolvedChecked === undefined ? defaultChecked : undefined}
				onChange={handleChange}
				aria-readonly={ariaAttr(resolvedReadOnly)}
				aria-describedby={resolvedDescribedBy}
				{...validation}
				className={k.input()}
			/>
			<Mark data-slot="checkbox-check" aria-hidden="true" className={k.mark()} strokeWidth={2} />
		</label>
	)
}
