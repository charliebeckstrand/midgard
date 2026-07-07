'use client'

import type { KeyboardEvent, RefObject } from 'react'

import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/calendar'
import { Button } from '../button'
import type { CalendarActive } from '../calendar'
import type { FooterButton } from './use-date-picker-keyboard'

/** Props for {@link DatePickerFooter}. @internal */
type DatePickerFooterProps = {
	/** Virtual highlight; a `footer`-zone entry styles the matching button active. */
	active: CalendarActive | null
	footerRef: RefObject<HTMLDivElement | null>
	/** Buttons to render, in order; empty renders nothing. */
	footerButtons: FooterButton[]
	onClear: () => void
	onToday?: () => void
	onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}

/**
 * Action toolbar (Clear/Today) below the calendar grid; renders nothing when
 * `footerButtons` is empty. The button matching the `footer`-zone virtual
 * highlight reads as active.
 *
 * @internal
 */
export function DatePickerFooter({
	active,
	footerButtons,
	onClear,
	onToday,
	footerRef,
	onKeyDown,
}: DatePickerFooterProps) {
	const { size } = useDensity()

	if (footerButtons.length === 0) return null

	return (
		<div
			ref={footerRef}
			role="toolbar"
			aria-label="Date picker actions"
			data-slot="calendar-footer"
			onKeyDown={onKeyDown}
			className={cn(k.footer({ size }))}
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
							className={cn(isActive && k.day.active.base)}
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
						className={cn(isActive && k.day.active.base)}
					>
						Today
					</Button>
				)
			})}
		</div>
	)
}
