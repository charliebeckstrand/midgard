'use client'

import type {
	ChangeEventHandler,
	FocusEventHandler,
	InputHTMLAttributes,
	KeyboardEventHandler,
	Ref,
} from 'react'
import { ariaAttr, cn } from '../../core'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/combobox'
import type { ControlSize } from '../control/context'
import { Input } from '../input'

type ComboboxInputHandlers = {
	onChange: ChangeEventHandler<HTMLInputElement>
	onFocus: FocusEventHandler<HTMLInputElement>
	onBlur: FocusEventHandler<HTMLInputElement>
	onKeyDown: KeyboardEventHandler<HTMLInputElement>
}

type ComboboxInputProps = {
	id?: string
	ref: Ref<HTMLInputElement>
	type?: InputHTMLAttributes<HTMLInputElement>['type']
	autoComplete?: InputHTMLAttributes<HTMLInputElement>['autoComplete']
	'aria-label'?: string
	open: boolean
	controlsId: string
	disabled?: boolean
	readOnly?: boolean
	required?: boolean
	value: string
	placeholder?: string
	density: ControlSize
	size: ControlSize
	handlers: ComboboxInputHandlers
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
	open,
	controlsId,
	disabled,
	readOnly,
	required,
	value,
	placeholder,
	density,
	size,
	handlers,
}: ComboboxInputProps) {
	return (
		<HeadlessProvider>
			<Input
				id={id}
				ref={ref}
				type={type}
				role="combobox"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? controlsId : undefined}
				aria-autocomplete="list"
				aria-label={ariaLabel}
				// role="combobox" overrides the native textbox semantics, so the
				// required/readOnly host-language attributes need explicit ARIA to
				// reach assistive tech.
				aria-readonly={ariaAttr(readOnly)}
				aria-required={ariaAttr(required)}
				data-slot="combobox-input"
				autoComplete={autoComplete}
				disabled={disabled}
				readOnly={readOnly}
				required={required}
				value={value}
				placeholder={placeholder}
				className={cn(k({ density, size }))}
				{...handlers}
			/>
		</HeadlessProvider>
	)
}
