'use client'

import type {
	ChangeEventHandler,
	FocusEventHandler,
	InputHTMLAttributes,
	KeyboardEventHandler,
	Ref,
} from 'react'
import { cn } from '../../core'
import { comboboxVariants } from '../../recipes/kata/combobox'
import type { ControlSize } from '../control/context'
import { Headless } from '../headless'
import { Input } from '../input'

type ComboboxInputHandlers = {
	onChange: ChangeEventHandler<HTMLInputElement>
	onFocus: FocusEventHandler<HTMLInputElement>
	onBlur: FocusEventHandler<HTMLInputElement>
	onKeyDown: KeyboardEventHandler<HTMLInputElement>
}

export type ComboboxInputProps = {
	id?: string
	ref: Ref<HTMLInputElement>
	type?: InputHTMLAttributes<HTMLInputElement>['type']
	autoComplete?: InputHTMLAttributes<HTMLInputElement>['autoComplete']
	open: boolean
	controlsId: string
	disabled?: boolean
	value: string
	placeholder?: string
	density: ControlSize
	size: ControlSize
	handlers: ComboboxInputHandlers
}

/**
 * Internal — the ARIA combobox input element wrapped in <Headless> so the
 * surrounding <SelectTrigger> chrome owns its appearance. Carries combobox
 * role + popup wiring; behaviour comes from useComboboxInput.
 *
 * Not exported from the package barrel — intentionally internal.
 */
export function ComboboxInput({
	id,
	ref,
	type = 'text',
	autoComplete,
	open,
	controlsId,
	disabled,
	value,
	placeholder,
	density,
	size,
	handlers,
}: ComboboxInputProps) {
	return (
		<Headless>
			<Input
				id={id}
				ref={ref}
				type={type}
				role="combobox"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? controlsId : undefined}
				aria-autocomplete="list"
				data-slot="combobox-input"
				autoComplete={autoComplete}
				disabled={disabled}
				value={value}
				placeholder={placeholder}
				className={cn(comboboxVariants({ density, size }))}
				{...handlers}
			/>
		</Headless>
	)
}
