'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../core'
import { useResolvedSize } from '../../primitives/concentric'
import { ControlFrame } from '../../primitives/control'
import { kokkaku } from '../../recipes'
import {
	controlVariants,
	k,
	type TextareaVariants,
	textareaVariants,
} from '../../recipes/kata/textarea'
import { useControl } from '../control/context'
import { invalidAttrs } from '../control/control-invalid-attrs'
import { useControlFieldProps } from '../control/use-control-field-props'
import { useFormText } from '../form/context'
import { useGlass } from '../glass/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'

export type TextareaProps = Omit<TextareaVariants, 'size'> & {
	size?: 'sm' | 'md' | 'lg'
	className?: string
	actions?: ReactNode
} & Omit<ComponentPropsWithoutRef<'textarea'>, 'className' | 'size'>

export function Textarea({
	className,
	variant,
	size,
	resize,
	autoResize,
	actions,
	id,
	autoComplete,
	disabled,
	required,
	readOnly,
	name,
	value,
	onChange,
	onBlur,
	rows = 3,
	style,
	...props
}: TextareaProps) {
	const glass = useGlass()
	const control = useControl()
	const binding = useFormText(name, { onChange, onBlur })

	const {
		id: resolvedId,
		autoComplete: resolvedAutoComplete,
		disabled: resolvedDisabled,
		required: resolvedRequired,
		readOnly: resolvedReadOnly,
		invalid: resolvedInvalid,
	} = useControlFieldProps({ id, autoComplete, disabled, required, readOnly, binding })

	const resolvedVariant = variant ?? control?.variant ?? (glass ? 'glass' : undefined)
	const resolvedSize = useResolvedSize(size)

	if (useSkeleton()) {
		return (
			<Placeholder
				className={cn(kokkaku.textarea.base, className)}
				style={{ height: `calc(${rows}lh + 1rem)` }}
			/>
		)
	}

	const controlProps = {
		id: resolvedId,
		name,
		autoComplete: resolvedAutoComplete,
		disabled: resolvedDisabled,
		required: resolvedRequired,
		readOnly: resolvedReadOnly,
		value: binding?.value ?? value,
		onChange: binding?.onChange ?? onChange,
		onBlur: binding?.onBlur ?? onBlur,
		...invalidAttrs(resolvedInvalid),
	}

	const hasActions = actions !== undefined

	// field-sizing: content ignores `rows`, so enforce it as a min-height floor.
	// Add extra space to account for padding and gap when actions are present.
	const hasActionsStyle = hasActions ? { minHeight: `calc(${rows}lh + 4rem)`, ...style } : style

	return (
		<ControlFrame
			className={cn(hasActions && k.frame, controlVariants({ variant: resolvedVariant }))}
		>
			<textarea
				data-slot="textarea"
				{...controlProps}
				rows={rows}
				style={hasActionsStyle}
				className={cn(
					textareaVariants({
						variant: resolvedVariant,
						size: resolvedSize,
						resize: hasActions ? 'none' : resize,
						autoResize,
					}),
					hasActions && k.bare,
					className,
				)}
				{...props}
			/>
			{hasActions && (
				<div data-slot="textarea-actions" className={cn(k.actions)}>
					{actions}
				</div>
			)}
		</ControlFrame>
	)
}
