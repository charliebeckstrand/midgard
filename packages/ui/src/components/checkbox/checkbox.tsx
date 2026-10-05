'use client'

import { Check, Minus } from 'lucide-react'
import { type ChangeEventHandler, type ComponentProps, useLayoutEffect, useRef } from 'react'
import { cn, dataAttr } from '../../core'
import { useComposedRef } from '../../hooks'
import { type CheckboxVariants, k } from '../../recipes/kata/checkbox'
import { useControlProps } from '../control/use-control-props'
import { useFormToggle } from '../form/use-form-toggle'

/** Props for {@link Checkbox}. */
export type CheckboxProps = CheckboxVariants & {
	/**
	 * Renders the partial tri-state, regardless of `checked`: a minus glyph, a
	 * `data-indeterminate` attribute on the input, and the `indeterminate` DOM property.
	 * @defaultValue false
	 */
	indeterminate?: boolean
	className?: string
} & Omit<ComponentProps<'input'>, 'className' | 'type' | 'size'>

/**
 * Labeled checkbox with an `indeterminate` tri-state. Binds to enclosing Form
 * and Control context for `name` and validation. The box takes the step of the
 * nearest density scope, and an explicit `size` opens a scope on the label. An explicit
 * `checked` prop wins over the bound field; `onChange` fires in either mode.
 * `defaultChecked` reaches the element only while the checkbox is uncontrolled,
 * so a bound checkbox ignores it (§7.2).
 */
export function Checkbox({
	className,
	color,
	size,
	indeterminate,
	id,
	disabled,
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
		validation,
		'aria-describedby': resolvedDescribedBy,
	} = useControlProps({
		id,
		disabled,
		required,
		'aria-describedby': ariaDescribedBy,
		invalid,
	})

	const internalRef = useRef<HTMLInputElement>(null)

	const setRef = useComposedRef(internalRef, ref)

	// `indeterminate` is a DOM property with no attribute; sync it before paint.
	// A server render runs no effect, so the input also carries
	// `data-indeterminate`. The kata keys the fill and the mark on that attribute.
	useLayoutEffect(() => {
		if (internalRef.current) internalRef.current.indeterminate = !!indeterminate
	}, [indeterminate])

	// An activation clears the property. The prop does not change, so the effect
	// does not run again. The wrapper writes the property, then calls the resolved
	// handler. It attaches only while the prop is true, so React keeps its warning
	// for a `checked` input with no `onChange` in the other case.
	const handleChange: ChangeEventHandler<HTMLInputElement> | undefined = indeterminate
		? (event) => {
				event.currentTarget.indeterminate = !!indeterminate

				resolvedOnChange?.(event)
			}
		: resolvedOnChange

	const Mark = indeterminate ? Minus : Check

	return (
		<label
			data-slot="control"
			data-density={size}
			data-disabled={dataAttr(resolvedDisabled)}
			className={cn(k({ color }), className)}
		>
			<input
				// Consumer props spread first; the resolved §7.2 binding, the
				// validation attributes, data-slot, and the state that the kata
				// reads take precedence.
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
				aria-describedby={resolvedDescribedBy}
				{...validation}
				className={k.input()}
			/>
			<Mark data-slot="checkbox-check" aria-hidden="true" className={k.mark()} strokeWidth={2} />
		</label>
	)
}
