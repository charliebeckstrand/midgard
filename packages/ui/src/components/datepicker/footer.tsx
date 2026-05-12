'use client'

import type { KeyboardEvent, RefObject } from 'react'

import { cn } from '../../core'
import { calendar as kCalendar } from '../../recipes/kata/calendar'
import { Button } from '../button'
import type { CalendarActive } from '../calendar'
import type { FooterButton } from './use-keyboard'

export type DatePickerFooterProps = {
	active: CalendarActive | null
	footerButtons: FooterButton[]
	onClear: () => void
	onToday?: () => void
	footerRef: RefObject<HTMLDivElement | null>
	onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}

export function DatePickerFooter({
	active,
	footerButtons,
	onClear,
	onToday,
	footerRef,
	onKeyDown,
}: DatePickerFooterProps) {
	if (footerButtons.length === 0) return null

	return (
		<div
			ref={footerRef}
			role="toolbar"
			data-slot="calendar-footer"
			onKeyDown={onKeyDown}
			className={cn(kCalendar.footer)}
		>
			{footerButtons.map((kind, index) => {
				const isActive = active?.zone === 'footer' && active.index === index

				if (kind === 'clear') {
					return (
						<Button
							key={kind}
							variant="soft"
							color="amber"
							onClick={onClear}
							aria-label="Clear selection"
							className={cn(isActive && kCalendar.day.active)}
						>
							Clear
						</Button>
					)
				}

				return (
					<Button
						key={kind}
						variant="soft"
						color="blue"
						onClick={onToday}
						className={cn(isActive && kCalendar.day.active)}
					>
						Today
					</Button>
				)
			})}
		</div>
	)
}
