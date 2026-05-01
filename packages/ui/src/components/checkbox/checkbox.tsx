'use client'

import { Check, Minus } from 'lucide-react'
import { type ComponentPropsWithRef, type ReactNode, useCallback, useRef } from 'react'
import { cn } from '../../core'
import { kokkaku } from '../../recipes'
import { useConcentric } from '../concentric'
import { useControl } from '../control/context'
import { useFormToggle } from '../form/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import {
	type CheckboxVariants,
	checkboxCheckSize,
	checkboxInputVariants,
	checkboxVariants,
} from './variants'

export type CheckboxProps = CheckboxVariants & {
	indeterminate?: boolean
	icon?: ReactNode
	className?: string
} & Omit<ComponentPropsWithRef<'input'>, 'className' | 'type' | 'size'>

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
	...props
}: CheckboxProps) {
	const concentric = useConcentric()
	const control = useControl()
	const binding = useFormToggle(name, { onChange })

	const internalRef = useRef<HTMLInputElement>(null)

	const resolvedId = id ?? control?.id

	const resolvedDisabled = disabled ?? control?.disabled
	const resolvedRequired = required ?? control?.required
	const resolvedSize = size ?? concentric?.size ?? 'md'

	const resolvedInvalid = control?.invalid || binding?.invalid

	const setRef = useCallback(
		(el: HTMLInputElement | null) => {
			internalRef.current = el
			if (el) el.indeterminate = !!indeterminate
			if (typeof ref === 'function') ref(el)
			else if (ref) ref.current = el
		},
		[indeterminate, ref],
	)

	if (useSkeleton()) {
		return <Placeholder className={cn(kokkaku.checkbox.base, className)} />
	}

	const checkClass = cn(
		'pointer-events-none absolute stroke-(--checkbox-check) opacity-0',
		checkboxCheckSize[resolvedSize],
	)

	return (
		<label
			data-slot="control"
			className={cn(checkboxVariants({ color, size: resolvedSize }), className)}
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
				{...(resolvedInvalid ? { 'data-invalid': '', 'aria-invalid': true } : {})}
				className={checkboxInputVariants()}
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
