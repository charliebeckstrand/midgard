'use client'

import type { KeyboardEventHandler, RefObject } from 'react'
import { cn } from '../../core/cn'
import { intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/calendar'
import { Button } from '../button'
import type { CalendarActive } from '../calendar'
import { datePickerMessages } from './date-picker-messages'
import type { FooterButton } from './use-date-picker-keyboard'

/** Props for {@link DatePickerFooter}. @internal */
type DatePickerFooterProps = {
	/** Virtual highlight; a `footer`-zone entry styles the matching button active. */
	active: CalendarActive | null
	/** Buttons to render, in order; empty renders nothing. */
	footerButtons: FooterButton[]
	onClear: () => void
	onToday?: () => void
	/** The toolbar element, which the calendar reads as its footer zone (`Calendar.footerRef`). */
	footerRef?: RefObject<HTMLDivElement | null>
	/**
	 * The key handler of the toolbar. The variants pass the footer handler of the
	 * calendar (`CalendarHandle.footerKeyDown`): the arrows move the focus
	 * between the buttons and up into the day grid. It does nothing while the
	 * picker steers the calendar, because the dialog then owns these keys.
	 */
	onKeyDown?: KeyboardEventHandler<HTMLDivElement>
}

/**
 * Action toolbar (Today/Clear) below the calendar grid; renders nothing when
 * `footerButtons` is empty. The button matching the `footer`-zone highlight
 * of the `input` popover reads as active.
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
	const intl = useIntl()

	if (footerButtons.length === 0) return null

	return (
		<div
			ref={footerRef}
			role="toolbar"
			aria-label={intl.formatMessage(datePickerMessages.actions)}
			data-slot="calendar-footer"
			className={k().footer}
			onKeyDown={onKeyDown}
		>
			{footerButtons.map((kind, index) => {
				const clear = kind === 'clear'

				return (
					<Button
						type="button"
						key={kind}
						variant="soft"
						color={clear ? 'amber' : 'blue'}
						onClick={clear ? onClear : onToday}
						aria-label={clear ? intl.formatMessage(intlMessages.clearSelection) : undefined}
						className={cn(active?.zone === 'footer' && active.index === index && k().day.active)}
						data-index={index}
					>
						{intl.formatMessage(clear ? intlMessages.clear : datePickerMessages.today)}
					</Button>
				)
			})}
		</div>
	)
}
