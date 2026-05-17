'use client'

import type { ReactNode, Ref } from 'react'
import { cn } from '../../core'
import { iro } from '../../recipes'
import { k, listboxVariants } from '../../recipes/kata/listbox'
import { Button } from '../button'
import type { ControlSize } from '../control/context'
import { invalidAttrs } from '../control/control-invalid-attrs'
import { Headless } from '../headless'

export type ListboxButtonProps = {
	id?: string
	ref: Ref<HTMLButtonElement>
	open: boolean
	controlsId: string
	disabled?: boolean
	invalid?: boolean
	label: ReactNode
	placeholder: string
	truncate: boolean
	tabularNums?: boolean
	density: ControlSize
	size: ControlSize
}

/**
 * Internal — the listbox trigger button wrapped in <Headless> so the
 * surrounding <SelectTrigger> chrome owns its appearance. Carries combobox
 * role + popup wiring and the truncated/placeholdered label slot.
 *
 * Not exported from the package barrel — intentionally internal.
 */
export function ListboxButton({
	id,
	ref,
	open,
	controlsId,
	disabled,
	invalid,
	label,
	placeholder,
	truncate,
	tabularNums,
	density,
	size,
}: ListboxButtonProps) {
	return (
		<Headless>
			<Button
				id={id}
				ref={ref}
				role="combobox"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? controlsId : undefined}
				dataSlot="listbox-button"
				disabled={disabled}
				{...invalidAttrs(invalid)}
				className={cn(listboxVariants({ density, size }))}
			>
				<span className={cn(k.value({ truncate }), tabularNums && 'tabular-nums')}>
					{label || <span className={cn(iro.text.muted)}>{placeholder}</span>}
				</span>
			</Button>
		</Headless>
	)
}
