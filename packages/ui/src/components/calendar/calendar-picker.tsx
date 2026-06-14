'use client'

import { useDensity } from '../../primitives/density'
import { Button } from '../button'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import { CalendarPickerGrid } from './calendar-picker-grid'
import { useCalendarPicker } from './use-calendar-picker'

type CalendarPickerProps = {
	year: number
	month: number
	today: Date | null
	onNavigate: (year: number, month: number) => void
	monthLabel: string
	monthLabels: string[]
	open?: boolean
	onOpenChange?: (open: boolean) => void
	triggerClassName?: string
}

/**
 * Popover-housed month/year picker behind the header's center trigger. State,
 * focus wiring, and the per-view cell config come from {@link useCalendarPicker};
 * this renders the trigger and the {@link CalendarPickerGrid} inside a modal
 * popover.
 *
 * @internal
 */
export function CalendarPicker({
	year,
	month,
	today,
	onNavigate,
	monthLabel,
	monthLabels,
	open,
	onOpenChange,
	triggerClassName,
}: CalendarPickerProps) {
	const { size } = useDensity()

	const {
		pickerOpen,
		handlePickerOpen,
		pickerHeaderRef,
		pickerGridRef,
		handleHeaderKeyDown,
		handleGridKeyDown,
		viewConfig,
	} = useCalendarPicker({ year, month, today, monthLabels, onNavigate, open, onOpenChange })

	return (
		<Popover placement="bottom" open={pickerOpen} onOpenChange={handlePickerOpen}>
			<PopoverTrigger>
				<Button variant="plain" className={triggerClassName}>
					{monthLabel}
				</Button>
			</PopoverTrigger>
			<PopoverContent modal>
				<CalendarPickerGrid
					headerRef={pickerHeaderRef}
					gridRef={pickerGridRef}
					onHeaderKeyDown={handleHeaderKeyDown}
					onGridKeyDown={handleGridKeyDown}
					{...viewConfig}
					size={size}
				/>
			</PopoverContent>
		</Popover>
	)
}
