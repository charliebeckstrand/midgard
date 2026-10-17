'use client'

import type { MessageDescriptor } from 'react-intl'
import { useIntl } from './use-intl'

/** Props for {@link IntlMessage}. @internal */
type IntlMessageProps = {
	/** The message to show. */
	message: MessageDescriptor
	/** The values of the placeholders of the message. */
	values?: Record<string, string | number>
}

/**
 * Renders one message in the language of the nearest `LocaleProvider`, as
 * text. A module with no `'use client'` renders it to show a message, so the
 * module itself reads no context.
 *
 * @internal
 */
export function IntlMessage({ message, values }: IntlMessageProps) {
	return useIntl().formatMessage(message, values)
}
