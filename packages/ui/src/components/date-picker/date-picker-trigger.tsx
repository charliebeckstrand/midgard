'use client'

import { Calendar as CalendarIcon } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useRef } from 'react'
import { ariaAttr, cn, dataAttr, type ValidationAttrs } from '../../core'
import type { ScaleStep } from '../../core/density'
import { useIsTruncated } from '../../hooks'
import { SelectTrigger } from '../../primitives/select-trigger'
import { useGlass } from '../../providers/glass/context'
import { HeadlessProvider } from '../../providers/headless'
import type { scale } from '../../recipes/kata/date-picker'
import { k } from '../../recipes/kata/date-picker'
import type { GroupStampProps } from '../../types/group-stamp'
import { Button } from '../button'
import { Icon } from '../icon'
import { InputClearButton } from '../input/input-clear-button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

/** Props for {@link DatePickerTrigger}. @internal */
type DatePickerTriggerProps = GroupStampProps & {
	open: boolean
	onOpenChange: (open: boolean) => void
	triggerId?: string
	/** The id of the dialog panel. The trigger names it in `aria-controls` while open. */
	dialogId?: string
	describedBy?: string
	setReference: (node: HTMLElement | null) => void
	getReferenceProps: () => Record<string, unknown>
	/** Text label for the selected value; ignored when `children` is provided. */
	displayValue?: string
	placeholder: string
	/**
	 * The density step of `<DatePicker>`. Omit it to take the step of the
	 * nearest density scope. A step makes the trigger a density scope.
	 */
	size?: ScaleStep<typeof scale>
	/** When `false`, the trigger grows to fit its content and omits the truncation Tooltip. */
	truncate?: boolean
	/**
	 * Custom value content rendered in place of the text label + truncation
	 * Tooltip — e.g. the relative variant's selection chips. The caller owns the
	 * empty/placeholder rendering and the `min-w-0 flex-1` layout.
	 */
	children?: ReactNode
	disabled?: boolean
	/**
	 * Marks the trigger with `aria-readonly` and `data-readonly`, as on Listbox.
	 * It also hides the clear button, because a read-only value cannot change.
	 */
	readOnly?: boolean
	required?: boolean
	/** The resolved validation attributes. The frame paints its ring from them. */
	validation?: ValidationAttrs
	onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
	/** Renders a clear button in place of the calendar icon while `hasValue`. */
	clearable?: boolean
	/** Whether a value is set; gates the clear button alongside `clearable`. */
	hasValue?: boolean
	/** Clears the value; fired by the clear button. */
	onClear?: () => void
	/** Accessible name for the trigger when no Field label wraps it; the placeholder is not a programmatic name. */
	'aria-label'?: string
	className?: string
}

/**
 * Popover reference button showing the selected date label (or placeholder).
 * Carries the dialog ARIA wiring (`aria-haspopup`, `aria-expanded`,
 * `aria-controls`, `aria-describedby`) and shows a Tooltip with the full label
 * when truncated. Pass `children` to render custom value content (the relative
 * variant's chips) in place of the text label.
 *
 * The button has `role="combobox"`, as on Listbox. A select-only combobox
 * takes its value from its content, so a screen reader announces the date
 * after an `aria-label` or a Field label. The role also makes `aria-readonly`
 * and `aria-required` valid.
 *
 * @internal
 */
export function DatePickerTrigger({
	open,
	onOpenChange,
	triggerId,
	dialogId,
	describedBy,
	setReference,
	getReferenceProps,
	displayValue = '',
	placeholder,
	size,
	'aria-label': ariaLabel,
	truncate = true,
	disabled = false,
	readOnly = false,
	required = false,
	validation,
	onKeyDown,
	clearable = false,
	hasValue = false,
	onClear,
	className,
	children,
	'data-group': dataGroup,
	'data-group-orientation': dataGroupOrientation,
}: DatePickerTriggerProps) {
	const glass = useGlass()

	const valueRef = useRef<HTMLSpanElement>(null)

	const triggerButtonRef = useRef<HTMLButtonElement>(null)

	const isTruncated = useIsTruncated(valueRef, displayValue)

	// Mirrors the Listbox/Combobox affordance: the clear button stands in for the
	// calendar icon while a value is set, clearing on click and returning focus
	// to the trigger as it unmounts (WCAG 2.4.3). A read-only value cannot
	// change, so the clear button does not show.
	const showClear = clearable && hasValue && !disabled && !readOnly

	const valueNode = (
		<span
			ref={valueRef}
			className={cn(k.value({ truncate }), truncate ? 'min-w-0 flex-1 overflow-hidden' : 'flex-1')}
		>
			{displayValue || <span className={cn(k.placeholder)}>{placeholder}</span>}
		</span>
	)

	return (
		// An explicit `size` makes the trigger a density scope. Without it, the
		// stepped classes of the control bridge take the step of the nearest scope.
		<SelectTrigger
			open={open}
			setReference={setReference}
			getReferenceProps={getReferenceProps}
			glass={glass}
			size={size}
			className={cn(k.root, className)}
			data-group={dataGroup}
			data-group-orientation={dataGroupOrientation}
			suffix={
				showClear ? (
					<InputClearButton
						label="Clear selection"
						onMouseDown={(event) => event.stopPropagation()}
						onClick={(event) => {
							event.stopPropagation()

							onClear?.()

							triggerButtonRef.current?.focus()
						}}
					/>
				) : undefined
			}
		>
			<HeadlessProvider>
				<Button
					ref={triggerButtonRef}
					type="button"
					id={triggerId}
					role="combobox"
					aria-label={ariaLabel}
					aria-haspopup="dialog"
					aria-expanded={open}
					aria-controls={open ? dialogId : undefined}
					aria-describedby={describedBy}
					aria-readonly={ariaAttr(readOnly)}
					aria-required={ariaAttr(required)}
					data-slot="datepicker-button"
					disabled={disabled}
					data-readonly={dataAttr(readOnly)}
					{...validation}
					onClick={() => onOpenChange(!open)}
					onKeyDown={onKeyDown}
					className={cn(k.button())}
				>
					{children ?? (
						<Tooltip disabled={!truncate || !isTruncated || !displayValue}>
							<TooltipTrigger>{valueNode}</TooltipTrigger>
							<TooltipContent>{displayValue}</TooltipContent>
						</Tooltip>
					)}
					{!showClear && (
						// A slot scope, so the icon is one step below the trigger.
						<span data-density="slot" className={cn(k.icon)}>
							<Icon icon={<CalendarIcon />} />
						</span>
					)}
				</Button>
			</HeadlessProvider>
		</SelectTrigger>
	)
}
