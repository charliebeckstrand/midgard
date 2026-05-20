'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn, invalidAttrs } from '../../core'
import { ControlFrame } from '../../primitives/control'
import { densityPresets, useDensity } from '../../primitives/density'
import { useSkeleton } from '../../providers/skeleton'
import type { Step } from '../../recipes'
import { kokkaku } from '../../recipes'
import { k, type TextareaVariants, textareaControl } from '../../recipes/kata/textarea'
import { useControl } from '../control/context'
import { useControlProps } from '../control/use-control-props'
import { useFormText } from '../form/context'
import { useGlass } from '../glass/context'
import { Placeholder } from '../placeholder'

export type TextareaProps = Omit<TextareaVariants, 'size'> & {
	size?: Step
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
	const inherited = useDensity()

	const token = size ? densityPresets[size] : inherited

	const {
		id: resolvedId,
		autoComplete: resolvedAutoComplete,
		disabled: resolvedDisabled,
		required: resolvedRequired,
		readOnly: resolvedReadOnly,
		invalid: resolvedInvalid,
	} = useControlProps({ id, autoComplete, disabled, required, readOnly, binding })

	const resolvedVariant = variant ?? control?.variant ?? (glass ? 'glass' : undefined)

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
			className={cn(hasActions && k.frame, textareaControl({ variant: resolvedVariant }))}
		>
			<textarea
				data-slot="textarea"
				{...controlProps}
				rows={rows}
				style={hasActionsStyle}
				className={cn(
					k({
						variant: resolvedVariant,
						density: token.density,
						size: token.size,
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
