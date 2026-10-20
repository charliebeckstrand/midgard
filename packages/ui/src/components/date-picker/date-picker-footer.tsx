'use client'

import { cn } from '../../core'
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
}

/**
 * Action toolbar (Today/Clear) below the calendar grid; renders nothing when
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
}: DatePickerFooterProps) {
	const intl = useIntl()

	if (footerButtons.length === 0) return null

	return (
		<div
			role="toolbar"
			aria-label={intl.formatMessage(datePickerMessages.actions)}
			data-slot="calendar-footer"
			className={cn(k.footer)}
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
						className={cn(active?.zone === 'footer' && active.index === index && k.day.active)}
						data-index={index}
					>
						{intl.formatMessage(clear ? intlMessages.clear : datePickerMessages.today)}
					</Button>
				)
			})}
		</div>
	)
}
