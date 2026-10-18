'use client'

import type { MessageDescriptor } from '@formatjs/intl'
import { useIntl } from './use-intl'

/** Props for {@link IntlMessage}: the message to show. */
export type IntlMessageProps = {
	/** The message to show. */
	message: MessageDescriptor
}

/**
 * Renders one message in the language of the nearest `LocaleProvider`, as
 * text. A module with no `'use client'` renders it to show a message, so the
 * module itself reads no context.
 *
 * @remarks Client component. It takes a message with no values. Format a
 * message with values through {@link useIntl}.
 */
export function IntlMessage({ message }: IntlMessageProps) {
	return useIntl().formatMessage(message)
}
