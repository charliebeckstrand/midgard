'use client'

import type { FocusEventHandler, KeyboardEventHandler, ReactNode, Ref } from 'react'
import { ariaAttr, cn, dataAttr, type ValidationAttrs } from '../../core'
import { useTruncation } from '../../hooks'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/listbox'
import { Button } from '../button'
import { useControlTriggerSurface } from '../control/use-control-trigger-surface'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

type ListboxButtonProps = {
	id?: string
	ref: Ref<HTMLButtonElement>
	open: boolean
	controlsId: string
	ariaLabel?: string
	ariaLabelledby?: string
	describedBy?: string
	disabled?: boolean
	readOnly?: boolean
	required?: boolean
	/** The resolved validation attributes. The frame paints its ring from them. */
	validation?: ValidationAttrs
	label?: ReactNode
	onBlur?: FocusEventHandler<HTMLButtonElement>
	onKeyDown?: KeyboardEventHandler<HTMLButtonElement>
	placeholder: string
	truncate: boolean
	/** Shows the whole label in a hover tooltip while the trigger truncates it. A label that is not a string shows no tooltip. */
	truncateTooltip: boolean
	/** Holds the truncation tooltip closed while the panel is open. */
	truncateTooltipSuppressed: boolean
}

/**
 * The label span of the trigger, in a tooltip that shows `label` while the span
 * truncates it. A separate unit, so a listbox without `truncateTooltip` mounts no
 * measure and no tooltip.
 *
 * @internal
 */
function ListboxTruncateTooltip({
	label,
	truncate,
	suppressed,
}: {
	label: string
	truncate: boolean
	suppressed: boolean
}) {
	const [valueRef, truncated] = useTruncation<HTMLSpanElement>()

	return (
		<Tooltip disabled={suppressed || !truncated}>
			<TooltipTrigger>
				<span ref={valueRef} className={k({ truncate }).value}>
					{label}
				</span>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	)
}

/**
 * The listbox trigger button wrapped in {@link HeadlessProvider}, deferring
 * appearance to the surrounding {@link SelectTrigger} chrome. Carries the
 * combobox role + popup wiring and the truncated/placeholdered label slot.
 *
 * @internal
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
	readOnly,
	required,
	validation,
	label,
	onBlur,
	onKeyDown,
	placeholder,
	truncate,
	truncateTooltip,
	truncateTooltipSuppressed,
}: ListboxButtonProps) {
	const surface = useControlTriggerSurface()

	return (
		<HeadlessProvider>
			<Button
				type="button"
				id={id}
				ref={ref}
				role="combobox"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? controlsId : undefined}
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledby}
				aria-describedby={describedBy}
				aria-readonly={ariaAttr(readOnly)}
				aria-required={ariaAttr(required)}
				data-slot="listbox-button"
				disabled={disabled}
				data-readonly={dataAttr(readOnly)}
				data-open={dataAttr(open)}
				data-disabled={dataAttr(disabled)}
				onBlur={onBlur}
				onKeyDown={onKeyDown}
				{...validation}
				className={cn(k({ variant: surface }).field)}
			>
				{/* The truncation measure reads a string, so a node label skips the tooltip. */}
				{truncateTooltip && typeof label === 'string' && label ? (
					<ListboxTruncateTooltip
						label={label}
						truncate={truncate}
						suppressed={truncateTooltipSuppressed}
					/>
				) : (
					<span className={k({ truncate }).value}>
						{label || <span className={cn(k.placeholder)}>{placeholder}</span>}
					</span>
				)}
			</Button>
		</HeadlessProvider>
	)
}
