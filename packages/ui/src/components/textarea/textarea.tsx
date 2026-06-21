'use client'

import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { cn } from '../../core'
import { ControlFrame } from '../../primitives/control'
import { useControlSize } from '../../primitives/density'
import { useGlass } from '../../providers/glass/context'
import type { Step } from '../../recipes'
import { k, type TextareaVariants } from '../../recipes/kata/textarea'
import { useControl } from '../control/context'
import { useControlProps } from '../control/use-control-props'
import { useInputValue } from '../input/use-input-value'

/** Props for {@link Textarea}: density `size`, `variant`, an `actions` slot, and the remaining `<textarea>` surface. */
export type TextareaProps = Omit<TextareaVariants, 'size' | 'variant'> & {
	size?: Step
	variant?: 'default' | 'outline'
	className?: string
	/** Trailing control slot; its presence pins `resize: none` and a min-height floor. */
	actions?: ReactNode
	ref?: Ref<HTMLTextAreaElement>
} & Omit<ComponentPropsWithoutRef<'textarea'>, 'className' | 'size'>

/**
 * Multi-line text control with optional `autoResize` and an `actions` slot.
 * Resolves variant, density, and binding from enclosing `<Form>`, `<Control>`,
 * `<GlassProvider>`, and Density contexts.
 *
 * @remarks Stays controlled when a `value` prop is present, even `null` or
 * `undefined`; binds to the Form field named `name` otherwise, sharing the
 * Input value cascade through {@link useInputValue}. With `actions`,
 * `field-sizing: content` ignores `rows`, so `rows` becomes a min-height floor.
 */
export function Textarea(props: TextareaProps) {
	// A wrapper that passes value={null} or value={undefined} stays controlled;
	// check for the prop's presence before destructuring.
	const hasValueProp = 'value' in props

	const {
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
		ref,
		'aria-describedby': ariaDescribedBy,
		...rest
	} = props
	const glass = useGlass()
	const control = useControl()
	const valueState = useInputValue<HTMLTextAreaElement>({
		hasValueProp,
		name,
		value,
		onChange,
		onBlur,
	})
	const token = useControlSize(size)

	const {
		id: resolvedId,
		autoComplete: resolvedAutoComplete,
		disabled: resolvedDisabled,
		required: resolvedRequired,
		readOnly: resolvedReadOnly,
		validation,
		'aria-describedby': resolvedDescribedBy,
	} = useControlProps({
		id,
		autoComplete,
		disabled,
		required,
		readOnly,
		'aria-describedby': ariaDescribedBy,
		invalid: valueState.invalid,
	})

	const resolvedVariant = variant ?? control?.variant ?? (glass ? 'glass' : undefined)

	const controlProps = {
		id: resolvedId,
		name,
		autoComplete: resolvedAutoComplete,
		disabled: resolvedDisabled,
		required: resolvedRequired,
		readOnly: resolvedReadOnly,
		value: valueState.value,
		onChange: valueState.onChange,
		onBlur: valueState.onBlur,
		'aria-describedby': resolvedDescribedBy,
		...validation,
	}

	const hasActions = actions !== undefined

	// `field-sizing: content` ignores `rows`; enforce it as a min-height floor.
	// Extra space covers padding and gap when actions are present.
	const hasActionsStyle = hasActions ? { minHeight: `calc(${rows}lh + 4rem)`, ...style } : style

	return (
		<ControlFrame
			className={cn(hasActions && k.frame, k.inputControl({ variant: resolvedVariant }))}
		>
			<textarea
				data-slot="textarea"
				ref={ref}
				{...controlProps}
				rows={rows}
				style={hasActionsStyle}
				className={cn(
					k({
						variant: resolvedVariant,
						density: token.space,
						size: token.size,
						resize: hasActions ? 'none' : resize,
						autoResize,
					}),
					hasActions && k.bare,
					className,
				)}
				{...rest}
			/>
			{hasActions && (
				<div data-slot="textarea-actions" className={cn(k.actions)}>
					{actions}
				</div>
			)}
		</ControlFrame>
	)
}
