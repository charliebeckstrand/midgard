'use client'

import { useComposedRefs } from 'motion/react'
import {
	type ChangeEvent,
	type ComponentProps,
	type ReactNode,
	useCallback,
	useRef,
	useState,
} from 'react'
import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import { useFormResetSync } from '../../hooks/use-form-reset-sync'
import { intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { useSlots } from '../../providers/headless/use-slots'
import type { scale } from '../../recipes/kata/input'
import { type InputVariants, k } from '../../recipes/kata/input'
import { clearNativeInput } from '../../utilities'
import type { ControlVariant } from '../control/context'
import { InputClearButton } from './input-clear-button'
import { InputFrame, isAffixPresent } from './input-frame'
import { useInputControl } from './use-input-control'

/** Props for {@link Input}: `size`/`variant`, `prefix`/`suffix` affixes, the `clearable` flag and its `clearLabel`, and `invalid` override atop native `<input>` attributes. */
export type InputProps = Omit<InputVariants, 'size' | 'variant'> & {
	size?: ScaleStep<typeof scale>
	/**
	 * The surface of the control: `default` fills it, `outline` draws a border
	 * with no fill, and `bare` draws neither ({@link ControlVariant}). When the
	 * prop is unset, the input takes the variant of the enclosing Control.
	 * Without one, it takes the glass surface in a GlassProvider.
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
	 * @defaultValue `'Clear'`, in the language of the reader.
	 */
	clearLabel?: string
	/**
	 * Sets the invalid state on or off, over the bound field and the Control.
	 * When omitted, inherits from Control / Form context.
	 * @defaultValue `false`, or `true` when the bound form field has an error or the enclosing Control has the `error` severity.
	 */
	invalid?: boolean
	/** Controlled value. `undefined` leaves the input uncontrolled; `null` keeps it controlled with no current value (CONVENTIONS §7.3). */
	value?: ComponentProps<'input'>['value'] | null
} & Omit<ComponentProps<'input'>, 'size' | 'prefix' | 'value'>

/**
 * Text input with optional `prefix`/`suffix` affixes and an optional clear
 * button.
 * Resolves variant and invalid state from enclosing Control, Form, and
 * GlassProvider context. Under headless context, the input and its affixes
 * render bare, with no frame and no classes.
 * The size takes the step of the nearest density scope through stepped
 * classes. An explicit `size` writes that scope on the frame. Plain text in
 * an affix has the text size of the input at each step.
 *
 * @remarks Follows the §7.3 value contract and the resolution order
 * (explicit prop > bound field > internal state) owned by {@link useInputValue}.
 * `defaultValue` reaches the element only while the input is uncontrolled, so
 * a bound input ignores it (§7.2).
 * An explicit `invalid` sets the invalid state on or off. When `invalid` is
 * omitted, the state comes from the bound field and any ambient Control error.
 * The clear button of `clearable` comes before the `suffix`. It keeps the focus
 * in the input. When the button goes away while it has the focus, the focus
 * goes to the input. On an
 * uncontrolled input, it follows a native form reset.
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
	clearLabel,
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
	...rest
}: InputProps) {
	const intl = useIntl()

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

	// An uncontrolled input keeps its value in the element, so the input follows
	// each edit to know when it is empty. It does this also while clearable is
	// off, so the clear button is correct when clearable turns on.
	const [ownFilled, setOwnFilled] = useState(() => `${defaultValue ?? ''}` !== '')

	const uncontrolled = field.attrs.value === undefined

	const filled = uncontrolled ? ownFilled : `${field.attrs.value}` !== ''

	// A native form reset reverts the uncontrolled input without firing onChange,
	// so the input reads the reverted value.
	const resetRef = useFormResetSync(uncontrolled, (input) => setOwnFilled(input.value !== ''))

	const setRefs = useComposedRefs(inputRef, resetRef, ref)

	// The clear button can go away while it holds the focus, for example when
	// the value empties or the caller turns clearable off. The focus then goes
	// to the input and not to <body> (WCAG 2.4.3). The cleanup runs before React
	// removes the button, so the button is still the active element.
	const clearButtonRef = useCallback((button: HTMLButtonElement) => {
		return () => {
			if (button.ownerDocument.activeElement === button) inputRef.current?.focus()
		}
	}, [])

	const handleChange = uncontrolled
		? (event: ChangeEvent<HTMLInputElement>) => {
				field.attrs.onChange?.(event)

				setOwnFilled(event.target.value !== '')
			}
		: field.attrs.onChange

	const editable = !field.attrs.disabled && !field.attrs.readOnly

	const clearButton =
		clearable && filled && editable ? (
			<InputClearButton
				ref={clearButtonRef}
				label={clearLabel ?? intl.formatMessage(intlMessages.clear)}
				// Keep the focus in the input, so that no blur runs before the clear.
				onMouseDown={(event) => event.preventDefault()}
				onClick={() => clearNativeInput(inputRef.current)}
			/>
		) : undefined

	const frameSuffix =
		clearButton && isAffixPresent(suffix) ? (
			<>
				{clearButton}
				{suffix}
			</>
		) : (
			(clearButton ?? suffix)
		)

	const slots = useSlots(k, {
		variant: field.variant,
		affixed: isAffixPresent(prefix) || isAffixPresent(frameSuffix),
	})

	const inputEl = (
		<input
			ref={setRefs}
			data-slot="input"
			type={type}
			{...rest}
			{...field.attrs}
			onChange={handleChange}
			className={cn(slots.field, className)}
		/>
	)

	return (
		<InputFrame input={inputEl} prefix={prefix} suffix={frameSuffix} slots={slots} density={size} />
	)
}
