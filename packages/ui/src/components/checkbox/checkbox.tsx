'use client'

import { Check, Minus } from 'lucide-react'
import {
	type ComponentPropsWithoutRef,
	type ReactNode,
	type Ref,
	useLayoutEffect,
	useRef,
} from 'react'
import { cn, invalidAttrs } from '../../core'
import { useComposedRef } from '../../hooks'
import { type CheckboxVariants, k } from '../../recipes/kata/checkbox'
import { useControlToggle } from '../control/use-control-toggle'
import { useFormToggle } from '../form/use-form-toggle'

/** Props for {@link Checkbox}. */
export type CheckboxProps = CheckboxVariants & {
	/** Renders the partial tri-state: a minus glyph and `indeterminate` DOM property regardless of `checked`. */
	indeterminate?: boolean
	/** Replaces the default check/minus glyph with custom content. */
	icon?: ReactNode
	className?: string
	ref?: Ref<HTMLInputElement>
} & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>

/**
 * Labeled checkbox with an `indeterminate` tri-state. Binds to enclosing Form
 * and Control context for `name`, validation, and sizing. An explicit
 * `checked` prop wins over the bound field; `onChange` fires in either mode.
 */
export function Checkbox({
	className,
	color,
	size,
	icon,
	indeterminate,
	id,
	disabled,
	required,
	ref,
	name,
	checked,
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
		invalid: resolvedInvalid,
		size: resolvedSize,
		'aria-describedby': resolvedDescribedBy,
	} = useControlToggle({
		id,
		disabled,
		required,
		size,
		'aria-describedby': ariaDescribedBy,
		invalid,
	})

	const internalRef = useRef<HTMLInputElement>(null)

	const setRef = useComposedRef(internalRef, ref)

	// `indeterminate` is a DOM property with no attribute; sync it before paint.
	useLayoutEffect(() => {
		if (internalRef.current) internalRef.current.indeterminate = !!indeterminate
	}, [indeterminate])

	const checkClass = cn(
		'pointer-events-none absolute stroke-(--check-mark) opacity-0',
		k.checkSize[resolvedSize],
	)

	const Mark = indeterminate ? Minus : Check

	return (
		<label
			data-slot="control"
			{...(resolvedDisabled ? { 'data-disabled': true } : {})}
			className={cn(k({ color, size: resolvedSize }), className)}
		>
			<input
				type="checkbox"
				data-slot="checkbox"
				ref={setRef}
				id={resolvedId}
				name={name}
				disabled={resolvedDisabled}
				required={resolvedRequired}
				checked={resolvedChecked}
				onChange={resolvedOnChange}
				aria-describedby={resolvedDescribedBy}
				{...invalidAttrs(resolvedInvalid)}
				className={k.input()}
				{...props}
			/>
			{icon ?? (
				<Mark
					data-slot="checkbox-check"
					aria-hidden="true"
					className={checkClass}
					strokeWidth={2}
				/>
			)}
		</label>
	)
}
