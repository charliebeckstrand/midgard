'use client'

import { type ChangeEvent, type ComponentProps, type ReactNode, useRef, useState } from 'react'
import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import { useComposedRef } from '../../hooks'
import { useFormResetSync } from '../../hooks/use-form-reset-sync'
import type { scale } from '../../recipes/kata/input'
import { type InputVariants, k } from '../../recipes/kata/input'
import type { GroupStampProps } from '../../types/group-stamp'
import { clearNativeInput } from '../../utilities'
import type { ControlVariant } from '../control/context'
import { InputClearButton } from './input-clear-button'
import { InputFrame } from './input-frame'
import { useInputControl } from './use-input-control'

/** Props for {@link Input}: `size`/`variant`, `prefix`/`suffix` affixes, the `clearable` flag and its `clearLabel`, and `invalid` override atop native `<input>` attributes. */
export type InputProps = GroupStampProps &
	Omit<InputVariants, 'size' | 'variant'> & {
		size?: ScaleStep<typeof scale>
		/**
		 * The surface of the control: `default` fills it, and `outline` draws a border
		 * with no fill. When the prop is unset, the input takes the variant of the
		 * enclosing Control. Without one, it takes the glass surface in a GlassProvider.
		 * @defaultValue 'default'
		 */
		variant?: ControlVariant
		prefix?: ReactNode
		suffix?: ReactNode
		/**
		 * Shows a clear button in the suffix while the input holds a value. The
		 * button empties the value through a native `input` event, so `onChange`
		 * and a bound field see the clear as an edit. A disabled or read-only
		 * input shows no clear button.
		 * @defaultValue false
		 */
		clearable?: boolean
		/**
		 * The accessible name of the clear button of `clearable`.
		 * @defaultValue 'Clear'
		 */
		clearLabel?: string
		/**
		 * Forces the invalid state. When omitted, inherits from Control / Form context.
		 * @defaultValue `false`, or `true` when the bound form field has an error or the enclosing Control has the `error` severity.
		 */
		invalid?: boolean
		/** Controlled value. `undefined` leaves the input uncontrolled; `null` keeps it controlled with no current value (CONVENTIONS §7.3). */
		value?: ComponentProps<'input'>['value'] | null
		className?: string
	} & Omit<ComponentProps<'input'>, 'className' | 'size' | 'prefix' | 'value'>

/**
 * Text input with optional `prefix`/`suffix` affixes and an optional clear
 * button.
 * Resolves variant and invalid state from enclosing Control, Form, and
 * GlassProvider context, and drops to a bare `<input>` under headless context.
 * The size takes the step of the nearest density scope through stepped
 * classes. An explicit `size` writes that scope on the frame. Plain text in
 * an affix has the text size of the input at each step.
 *
 * @remarks Follows the §7.3 value contract and the resolution order
 * (explicit prop > bound field > internal state) owned by {@link useInputValue}.
 * `defaultValue` reaches the element only while the input is uncontrolled, so
 * a bound input ignores it (§7.2).
 * `invalid` OR's the prop, the bound field, and any ambient Control error.
 * Under headless context the affix frame and recipe classes are all skipped.
 * The clear button of `clearable` comes before the `suffix`. It keeps the focus
 * in the input, and it does not show under headless context. On an uncontrolled
 * input, it follows a native form reset.
 * @see {@link InputFrame}
 */
export function Input({
	className,
	type,
	variant,
	size,
	prefix,
	suffix,
	clearable = false,
	clearLabel = 'Clear',
	id,
	disabled,
	required,
	readOnly,
	autoComplete,
	invalid,
	name,
	value,
	defaultValue,
	onChange,
	onBlur,
	ref,
	'aria-describedby': ariaDescribedBy,
	'data-group': dataGroup,
	'data-group-orientation': dataGroupOrientation,
	...rest
}: InputProps) {
	const field = useInputControl({
		id,
		name,
		autoComplete,
		disabled,
		required,
		readOnly,
		invalid,
		variant,
		value,
		defaultValue,
		onChange,
		onBlur,
		'aria-describedby': ariaDescribedBy,
	})

	const inputRef = useRef<HTMLInputElement>(null)

	const setRefs = useComposedRef(inputRef, ref)

	// An uncontrolled input keeps its value in the element, so the clear button
	// follows each edit to know when the input is empty.
	const [ownFilled, setOwnFilled] = useState(() => `${defaultValue ?? ''}` !== '')

	const uncontrolled = field.attrs.value === undefined

	const filled = uncontrolled ? ownFilled : `${field.attrs.value}` !== ''

	// A native form reset reverts the uncontrolled input without firing onChange,
	// so the clear button reads the reverted value.
	useFormResetSync(inputRef, clearable && uncontrolled, (input) => setOwnFilled(input.value !== ''))

	const handleChange = clearable
		? (event: ChangeEvent<HTMLInputElement>) => {
				field.attrs.onChange?.(event)

				setOwnFilled(event.target.value !== '')
			}
		: field.attrs.onChange

	const inputEl = (
		<input
			ref={setRefs}
			data-slot="input"
			type={type}
			{...field.attrs}
			onChange={handleChange}
			className={cn(!field.headless && k({ variant: field.variant }), className)}
			{...rest}
		/>
	)

	if (field.headless) return inputEl

	const clear =
		clearable && filled && !field.attrs.disabled && !field.attrs.readOnly ? (
			<InputClearButton
				label={clearLabel}
				// Keep the focus in the input, so that no blur runs before the clear.
				onMouseDown={(event) => event.preventDefault()}
				onClick={() => clearNativeInput(inputRef.current)}
			/>
		) : undefined

	return (
		<InputFrame
			inputEl={inputEl}
			prefix={prefix}
			suffix={
				clear && suffix != null && suffix !== false ? (
					<>
						{clear}
						{suffix}
					</>
				) : (
					(clear ?? suffix)
				)
			}
			variant={field.variant}
			density={size}
			dataGroup={dataGroup}
			dataGroupOrientation={dataGroupOrientation}
		/>
	)
}
