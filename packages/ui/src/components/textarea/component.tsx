'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../core'
import { ControlFrame } from '../../primitives'
import { kokkaku } from '../../recipes'
import {
	controlVariants,
	k,
	type TextareaVariants,
	textareaVariants,
} from '../../recipes/kata/textarea'
import { useControl } from '../control/context'
import { invalidAttrs } from '../control/invalid-attrs'
import { useFieldProps } from '../control/use-field-props'
import { useFormText } from '../form/context'
import { useGlass } from '../glass/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'

export type TextareaProps = TextareaVariants & {
	className?: string
	actions?: ReactNode
} & Omit<ComponentPropsWithoutRef<'textarea'>, 'className'>

export function Textarea({
	className,
	variant,
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
	} = useFieldProps({ id, autoComplete, disabled, required, readOnly, binding })

	const resolvedVariant = variant ?? control?.variant ?? (glass ? 'glass' : undefined)

	if (useSkeleton()) {
		return <Placeholder className={cn(kokkaku.textarea.base, className)} />
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

	// When autoResize is enabled, field-sizing-content ignores the rows attribute.
	// Set a min-height based on rows so it acts as a floor.
	const autoResizeStyle =
		autoResize && rows ? { minHeight: `calc(${rows}lh + 1rem)`, ...style } : style

	const hasActions = actions !== undefined

	return (
		<ControlFrame
			className={cn(hasActions && k.frame, controlVariants({ variant: resolvedVariant }))}
		>
			<textarea
				data-slot="textarea"
				{...controlProps}
				rows={rows}
				style={autoResizeStyle}
				className={cn(
					textareaVariants({
						variant: resolvedVariant,
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
