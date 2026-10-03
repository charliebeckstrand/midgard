'use client'

import type {
	ChangeEventHandler,
	ClipboardEventHandler,
	ComponentProps,
	FocusEventHandler,
	KeyboardEventHandler,
	MouseEventHandler,
	ReactElement,
	RefObject,
	UIEventHandler,
} from 'react'
import { ariaAttr, cn } from '../../core'
import { useIsTruncated } from '../../hooks'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/combobox'
import { capitalizeFirst } from '../../utilities'
import { Input } from '../input'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

type ComboboxInputHandlers = {
	onChange: ChangeEventHandler<HTMLInputElement>
	onFocus: FocusEventHandler<HTMLInputElement>
	onMouseDown: MouseEventHandler<HTMLInputElement>
	onBlur: FocusEventHandler<HTMLInputElement>
	onKeyDown: KeyboardEventHandler<HTMLInputElement>
	onPaste: ClipboardEventHandler<HTMLInputElement>
	onScroll: UIEventHandler<HTMLInputElement>
}

type ComboboxInputProps = {
	id?: string
	ref: RefObject<HTMLInputElement | null>
	type?: ComponentProps<'input'>['type']
	autoComplete?: ComponentProps<'input'>['autoComplete']
	'aria-label'?: string
	'aria-labelledby'?: string
	'aria-describedby'?: string
	open: boolean
	controlsId: string
	disabled?: boolean
	readOnly?: boolean
	required?: boolean
	/**
	 * True while the combobox holds a selection. A selection satisfies
	 * `required`, also when the input shows no text, so the native `required`
	 * drops. `aria-required` stays.
	 */
	selected: boolean
	/** The bound field's validation state, so the frame rings for its own errors. */
	invalid?: boolean
	value: string
	placeholder?: string
	/** Native hover/description text — the whole selection where the value is a count. */
	title?: string
	/** True while the input shows the live query rather than the resolved value. */
	editing: boolean
	/** First-word-capitalizes the resolved display value (its first letter). */
	capitalize: boolean
	/**
	 * Shows the whole value in a hover tooltip while the input truncates it. The
	 * tooltip stays closed while the panel is open or the input shows a query.
	 */
	valueTooltip?: boolean
	handlers: ComboboxInputHandlers
}

/**
 * Wraps the input in a tooltip that shows `text` while the input truncates it.
 * A separate unit, so a combobox without `valueTooltip` mounts no measure and no
 * tooltip.
 *
 * @internal
 */
function ComboboxValueTooltip({
	inputRef,
	text,
	suppressed,
	children,
}: {
	inputRef: RefObject<HTMLInputElement | null>
	text: string
	suppressed: boolean
	children: ReactElement
}) {
	const truncated = useIsTruncated(inputRef, text)

	return (
		<Tooltip disabled={suppressed || !truncated}>
			<TooltipTrigger>{children}</TooltipTrigger>
			<TooltipContent>{text}</TooltipContent>
		</Tooltip>
	)
}

/**
 * The ARIA combobox input element, wrapped in `<HeadlessProvider>`; the surrounding
 * `<SelectTrigger>` chrome owns its appearance. Carries the combobox role and
 * popup wiring; {@link useComboboxInput} supplies behavior.
 *
 * @internal
 */
export function ComboboxInput({
	id,
	ref,
	type = 'text',
	autoComplete,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
	'aria-describedby': ariaDescribedBy,
	open,
	controlsId,
	disabled,
	readOnly,
	required,
	selected,
	invalid,
	value,
	placeholder,
	title,
	editing,
	capitalize,
	valueTooltip = false,
	handlers,
}: ComboboxInputProps) {
	// Transform only the resolved value; the live query renders as typed.
	const display = capitalize && !editing ? capitalizeFirst(value) : value

	const input = (
		<Input
			invalid={invalid}
			id={id}
			ref={ref}
			type={type}
			role="combobox"
			aria-haspopup="listbox"
			aria-expanded={open}
			aria-controls={open ? controlsId : undefined}
			aria-autocomplete="list"
			aria-label={ariaLabel}
			aria-labelledby={ariaLabelledby}
			aria-describedby={ariaDescribedBy}
			title={title}
			// role="combobox" overrides the native textbox semantics, so the
			// required/readOnly host-language attributes need explicit ARIA to
			// reach assistive tech.
			aria-readonly={ariaAttr(readOnly)}
			aria-required={ariaAttr(required)}
			data-slot="combobox-input"
			autoComplete={autoComplete}
			disabled={disabled}
			readOnly={readOnly}
			required={required && !selected}
			value={display}
			placeholder={placeholder}
			className={cn(k())}
			{...handlers}
		/>
	)

	return (
		<HeadlessProvider>
			{valueTooltip ? (
				<ComboboxValueTooltip inputRef={ref} text={display} suppressed={open || editing}>
					{input}
				</ComboboxValueTooltip>
			) : (
				input
			)}
		</HeadlessProvider>
	)
}
