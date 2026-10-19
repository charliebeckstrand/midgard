'use client'

import { useComposedRefs } from 'motion/react'
import {
	type ChangeEventHandler,
	type ClipboardEventHandler,
	type ComponentProps,
	type FocusEventHandler,
	type KeyboardEventHandler,
	type MouseEventHandler,
	type ReactElement,
	type Ref,
	type RefObject,
	type UIEventHandler,
	useLayoutEffect,
} from 'react'
import { ariaAttr, cn, dataAttr } from '../../core'
import { useIsTruncated } from '../../hooks'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
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
	/** The `resetRef` of the value binding: a native form reset ends the selection. */
	resetRef?: Ref<HTMLInputElement>
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
	 * drops. `aria-required` stays. Typed text is not a selection, so a required
	 * input with text and no selection stays natively invalid.
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
	truncateTooltip?: boolean
	handlers: ComboboxInputHandlers
}

const messages = defineMessages({
	unselected: {
		id: 'ui.combobox.unselected',
		defaultMessage: 'Select an option from the list.',
		description:
			'The browser validation message of a required combobox that holds typed text but no selected option.',
	},
})

/**
 * Wraps the input in a tooltip that shows `text` while the input truncates it.
 * A separate unit, so a combobox without `truncateTooltip` mounts no measure and no
 * tooltip.
 *
 * @internal
 */
function ComboboxTruncateTooltip({
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
	resetRef,
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
	truncateTooltip = false,
	handlers,
}: ComboboxInputProps) {
	const intl = useIntl()

	// Transform only the resolved value; the live query renders as typed.
	const display = capitalize && !editing ? capitalizeFirst(value) : value

	// Typed text fills the input, so the native `required` alone passes it. The
	// text is not a selection, so a custom error keeps the input invalid. An empty
	// input still fails as `valueMissing`.
	const unselected = Boolean(required) && !selected && value !== ''

	// The native validation message of a required input that shows typed text and
	// holds no selection.
	const unselectedMessage = intl.formatMessage(messages.unselected)

	useLayoutEffect(() => {
		ref.current?.setCustomValidity(unselected ? unselectedMessage : '')
	}, [ref, unselected, unselectedMessage])

	const setRefs = useComposedRefs(ref, resetRef)

	const input = (
		<Input
			invalid={invalid}
			id={id}
			ref={setRefs}
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
			data-open={dataAttr(open)}
			data-disabled={dataAttr(disabled)}
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
			{truncateTooltip ? (
				<ComboboxTruncateTooltip inputRef={ref} text={display} suppressed={open || editing}>
					{input}
				</ComboboxTruncateTooltip>
			) : (
				input
			)}
		</HeadlessProvider>
	)
}
