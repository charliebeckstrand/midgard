'use client'

import { Calendar as CalendarIcon } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useRef } from 'react'

import { cn, invalidAttrs } from '../../core'
import { useIsTruncated } from '../../hooks'
import { AffixContext, affixStepDown } from '../../primitives/affix'
import { ControlFrame } from '../../primitives/control'
import { useGlass } from '../../providers/glass/context'
import { k } from '../../recipes/kata/date-picker'
import { Button } from '../button'
import type { ControlSize } from '../control/context'
import { Headless } from '../headless'
import { Icon } from '../icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

// Calendar icon is one step smaller than the trigger size.
const iconSize = { sm: 'xs', md: 'sm', lg: 'md' } as const

type DatePickerTriggerProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	triggerId?: string
	describedBy?: string
	setReference: (node: HTMLElement | null) => void
	getReferenceProps: () => Record<string, unknown>
	displayValue: string
	placeholder: string
	size: ControlSize
	/** When `false`, the trigger grows to fit its content and omits the truncation Tooltip. */
	truncate?: boolean
	disabled?: boolean
	required?: boolean
	invalid?: boolean
	onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
	/** Accessible name for the trigger when no Field label wraps it; the placeholder is not a programmatic name. */
	'aria-label'?: string
	/** Rendered in a standard suffix slot after the trigger button, inside the same frame. */
	suffix?: ReactNode
	className?: string
	'data-group'?: string
	'data-group-orientation'?: string
}

export function DatePickerTrigger({
	open,
	onOpenChange,
	triggerId,
	describedBy,
	setReference,
	getReferenceProps,
	displayValue,
	placeholder,
	size,
	'aria-label': ariaLabel,
	truncate = true,
	disabled = false,
	required = false,
	invalid = false,
	onKeyDown,
	suffix,
	className,
	'data-group': dataGroup,
	'data-group-orientation': dataGroupOrientation,
}: DatePickerTriggerProps) {
	const glass = useGlass()

	const valueRef = useRef<HTMLSpanElement>(null)

	const isTruncated = useIsTruncated(valueRef, displayValue)

	const valueNode = (
		<span ref={valueRef} className={k.value({ truncate })}>
			{displayValue || <span className={cn(k.placeholder)}>{placeholder}</span>}
		</span>
	)

	return (
		<div data-slot="control" ref={setReference} className={cn(className)} {...getReferenceProps()}>
			<ControlFrame
				data-open={open || undefined}
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
				className={cn('', k.surface[glass ? 'glass' : 'default'])}
			>
				<Headless>
					<Button
						type="button"
						id={triggerId}
						aria-label={ariaLabel}
						aria-haspopup="dialog"
						aria-expanded={open}
						aria-describedby={describedBy}
						aria-required={required || undefined}
						data-slot="datepicker-button"
						disabled={disabled}
						{...invalidAttrs(invalid)}
						onClick={() => onOpenChange(!open)}
						onKeyDown={onKeyDown}
						className={cn(k.button({ density: size, size }))}
					>
						<Tooltip
							enabled={truncate && isTruncated && Boolean(displayValue)}
							className={truncate ? 'min-w-0 flex-1 overflow-hidden' : 'flex-1'}
						>
							<TooltipTrigger>{valueNode}</TooltipTrigger>
							<TooltipContent>{displayValue}</TooltipContent>
						</Tooltip>
						<span className={cn(k.icon)}>
							<Icon icon={<CalendarIcon />} size={iconSize[size]} />
						</span>
					</Button>
				</Headless>
				{suffix != null && (
					<AffixContext value={affixStepDown(size)}>
						<span data-slot="suffix" className={cn(k.affix.base, k.affix.suffix[size])}>
							{suffix}
						</span>
					</AffixContext>
				)}
			</ControlFrame>
		</div>
	)
}
