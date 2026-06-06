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
import { useSkeleton } from '../../providers/skeleton'
import { type CheckboxVariants, k } from '../../recipes/kata/checkbox'
import { useControlToggle } from '../control/use-control-toggle'
import { useFormToggle } from '../form/use-form-toggle'
import { CheckboxSkeleton } from './checkbox-skeleton'

export type CheckboxProps = CheckboxVariants & {
	indeterminate?: boolean
	icon?: ReactNode
	className?: string
	ref?: Ref<HTMLInputElement>
} & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>

/**
 * Labeled checkbox with an `indeterminate` tri-state — binds to enclosing Form
 * and Control context for `name`, validation, and sizing.
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
	const binding = useFormToggle(name, { onChange })

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
		binding,
	})

	const internalRef = useRef<HTMLInputElement>(null)

	const setRef = useComposedRef(internalRef, ref)

	// `indeterminate` is a DOM property with no attribute; sync it before paint.
	// Keyed on the value so toggling it no longer detaches and reattaches the node.
	useLayoutEffect(() => {
		if (internalRef.current) internalRef.current.indeterminate = !!indeterminate
	}, [indeterminate])

	if (useSkeleton()) {
		return <CheckboxSkeleton className={className} />
	}

	const checkClass = cn(
		'pointer-events-none absolute stroke-(--check-mark) opacity-0',
		k.checkSize[resolvedSize],
	)

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
				checked={binding?.checked ?? checked}
				onChange={binding?.onChange ?? onChange}
				aria-describedby={resolvedDescribedBy}
				{...invalidAttrs(resolvedInvalid)}
				className={k.input()}
				{...props}
			/>
			{indeterminate
				? (icon ?? (
						<Minus
							data-slot="checkbox-check"
							aria-hidden="true"
							className={checkClass}
							strokeWidth={2}
						/>
					))
				: (icon ?? (
						<Check
							data-slot="checkbox-check"
							aria-hidden="true"
							className={checkClass}
							strokeWidth={2}
						/>
					))}
		</label>
	)
}
