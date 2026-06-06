'use client'

import type { ReactNode, Ref } from 'react'
import { cn, invalidAttrs } from '../../core'
import { k } from '../../recipes/kata/listbox'
import { Button } from '../button'
import type { ControlSize } from '../control/context'
import { Headless } from '../headless'

type ListboxButtonProps = {
	id?: string
	ref: Ref<HTMLButtonElement>
	open: boolean
	controlsId: string
	ariaLabel?: string
	ariaLabelledby?: string
	describedBy?: string
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
	ariaLabel,
	ariaLabelledby,
	describedBy,
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
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledby}
				aria-describedby={describedBy}
				data-slot="listbox-button"
				disabled={disabled}
				{...invalidAttrs(invalid)}
				className={cn(k({ density, size }))}
			>
				<span className={cn(k.value({ truncate }), tabularNums && 'tabular-nums')}>
					{label || <span className={cn(k.placeholder)}>{placeholder}</span>}
				</span>
			</Button>
		</Headless>
	)
}
