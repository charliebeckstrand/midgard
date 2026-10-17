'use client'

import type { MessageDescriptor } from '@formatjs/intl'
import { useIntl } from './use-intl'

/** Props for {@link IntlMessage}. @internal */
type IntlMessageProps = {
	/** The message to show. */
	message: MessageDescriptor
}

/**
 * Renders one message in the language of the nearest `LocaleProvider`, as
 * text. A module with no `'use client'` renders it to show a message, so the
 * module itself reads no context.
 *
 * @internal
 */
export function IntlMessage({ message }: IntlMessageProps) {
	return useIntl().formatMessage(message)
}
