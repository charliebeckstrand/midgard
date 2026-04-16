'use client'

import { cn } from '../../core'
import { ControlFrame } from '../../primitives'
import { kokkaku } from '../../recipes'
import { useControl } from '../control/context'
import { useFormText } from '../form/context'
import { useGlass } from '../glass/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { controlVariants, k, type TextareaVariants, textareaVariants } from './variants'

export type TextareaProps = TextareaVariants & {
	className?: string
	actions?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'textarea'>, 'className'>

export function Textarea({
	className,
	variant,
	resize,
	autoResize,
	actions,
	id,
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

	const resolvedId = id ?? control?.id
	const resolvedDisabled = disabled ?? control?.disabled
	const resolvedRequired = required ?? control?.required
	const resolvedReadOnly = readOnly ?? control?.readOnly

	const resolvedVariant = variant ?? control?.variant ?? (glass ? 'glass' : undefined)

	const resolvedInvalid = control?.invalid || binding?.invalid

	if (useSkeleton()) {
		return <Placeholder className={cn(kokkaku.textarea.base, className)} />
	}

	const controlProps = {
		id: resolvedId,
		name,
		disabled: resolvedDisabled,
		required: resolvedRequired,
		readOnly: resolvedReadOnly,
		value: binding?.value ?? value,
		onChange: binding?.onChange ?? onChange,
		onBlur: binding?.onBlur ?? onBlur,
		...(resolvedInvalid ? { 'data-invalid': '', 'aria-invalid': true as const } : {}),
	}

	// When autoResize is enabled, field-sizing-content ignores the rows attribute.
	// Set a min-height based on rows so it acts as a floor.
	const autoResizeStyle =
		autoResize && rows ? { minHeight: `calc(${rows}lh + 1rem)`, ...style } : style

	if (actions !== undefined) {
		return (
			<ControlFrame className={cn(k.frame, controlVariants({ variant: resolvedVariant }))}>
				<textarea
					data-slot="textarea"
					{...controlProps}
					rows={rows}
					style={autoResizeStyle}
					className={cn(
						textareaVariants({ variant: resolvedVariant, resize: 'none', autoResize }),
						k.bare,
						className,
					)}
					{...props}
				/>
				<div data-slot="textarea-actions" className={cn(k.actions)}>
					{actions}
				</div>
			</ControlFrame>
		)
	}

	return (
		<ControlFrame className={cn(controlVariants({ variant: resolvedVariant }))}>
			<textarea
				data-slot="textarea"
				{...controlProps}
				rows={rows}
				style={autoResizeStyle}
				className={cn(
					textareaVariants({ variant: resolvedVariant, resize, autoResize }),
					className,
				)}
				{...props}
			/>
		</ControlFrame>
	)
}
