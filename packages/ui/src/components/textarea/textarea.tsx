'use client'

import { type ComponentProps, type ReactNode, useRef } from 'react'
import { cn } from '../../core'
import { useComposedRef } from '../../hooks/use-composed-ref'
import { useIdScope } from '../../hooks/use-id-scope'
import { ControlFrame } from '../../primitives/control'
import { Density } from '../../primitives/density'
import { useGlass } from '../../providers/glass/context'
import { useHeadless } from '../../providers/headless/context'
import { k, type TextareaVariants } from '../../recipes/kata/textarea'
import { type ControlSize, type ControlVariant, useControl } from '../control/context'
import { useControlProps } from '../control/use-control-props'
import { useInputValue } from '../input/use-input-value'
import { useTextareaAutoResize } from './use-textarea-auto-resize'

/** Props for {@link Textarea}: density `size`, `variant`, `autoResize`, an `actions` slot, and the remaining `<textarea>` surface. */
export type TextareaProps = Omit<TextareaVariants, 'size' | 'variant'> & {
	size?: ControlSize
	variant?: ControlVariant
	className?: string
	/**
	 * Grow and shrink the field with its content. `rows` sets the minimum
	 * height, and a `max-height` class sets the maximum height.
	 * @defaultValue false
	 */
	autoResize?: boolean
	/** Control slot rendered as a right-justified row below the field; its presence pins `resize: none`. */
	actions?: ReactNode
	/** Controlled value. `undefined` leaves the textarea uncontrolled; `null` keeps it controlled with no current value (CONVENTIONS §7.3). */
	value?: ComponentProps<'textarea'>['value'] | null
} & Omit<ComponentProps<'textarea'>, 'className' | 'size' | 'value'>

/**
 * Multi-line text control with optional `autoResize` and an `actions` slot.
 * Resolves variant and binding from enclosing `<Form>`, `<Control>`, and
 * `<GlassProvider>` contexts, and takes the step of the nearest density scope.
 * Under headless context, it drops to a bare `<textarea>`.
 *
 * @remarks Shares the Input value cascade through {@link useInputValue},
 * including the §7.3 value contract it owns. `defaultValue` reaches the element
 * only while the textarea is uncontrolled, so a bound textarea ignores it.
 * With `autoResize`, the textarea measures its content before paint, on each
 * input, and when its width changes. It does not use `field-sizing: content`,
 * because that property ignores `rows` and is not in each browser at the
 * floor. With `actions`, the frame stacks the field above a right-justified
 * actions row.
 * A set `size` opens a density scope. The actions row gets the affix size, one
 * step below the textarea, as the Input affixes do. Under headless context the
 * frame, the recipe classes, and the actions row are all skipped.
 */
export function Textarea({
	className,
	variant,
	size,
	resize,
	autoResize = false,
	actions,
	id,
	autoComplete,
	disabled,
	required,
	readOnly,
	name,
	value,
	defaultValue,
	onChange,
	onBlur,
	rows = 3,
	ref,
	'aria-describedby': ariaDescribedBy,
	...rest
}: TextareaProps) {
	const glass = useGlass()
	const control = useControl()
	const headless = useHeadless()
	const valueState = useInputValue<HTMLTextAreaElement>({
		name,
		value,
		onChange,
		onBlur,
	})

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

	const scope = useIdScope({ id: resolvedId })

	const fieldRef = useRef<HTMLTextAreaElement>(null)

	const composedRef = useComposedRef(fieldRef, ref)

	useTextareaAutoResize(fieldRef, autoResize, valueState.value)

	const resolvedVariant = variant ?? control?.variant ?? (glass ? 'glass' : undefined)

	const controlProps = {
		id: scope.id,
		name,
		autoComplete: resolvedAutoComplete,
		disabled: resolvedDisabled,
		required: resolvedRequired,
		readOnly: resolvedReadOnly,
		value: valueState.value,
		defaultValue: valueState.value === undefined ? defaultValue : undefined,
		onChange: valueState.onChange,
		onBlur: valueState.onBlur,
		'aria-describedby': resolvedDescribedBy,
		...validation,
	}

	// Under headless context the actions row is not rendered, so it sets no layout.
	const hasActions = !headless && actions !== undefined

	const textareaEl = (
		<textarea
			data-slot="textarea"
			ref={composedRef}
			{...controlProps}
			rows={rows}
			className={cn(
				!headless &&
					k({
						variant: resolvedVariant,
						resize: hasActions ? 'none' : resize,
					}),
				hasActions && k.bare,
				className,
			)}
			{...rest}
		/>
	)

	if (headless) return textareaEl

	return (
		<Density step={size}>
			<ControlFrame
				data-density={size}
				className={cn(
					hasActions && k.frame,
					hasActions && k.stack,
					k.inputControl({ variant: resolvedVariant }),
				)}
			>
				{textareaEl}
				{hasActions && (
					<div data-slot="textarea-actions" data-density="slot" className={cn(k.actions)}>
						{actions}
					</div>
				)}
			</ControlFrame>
		</Density>
	)
}
