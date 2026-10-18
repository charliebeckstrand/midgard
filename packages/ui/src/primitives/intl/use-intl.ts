'use client'

import { useIntlContext } from './context'
import type { IntlShape } from './types'

/**
 * Reads the intl of the nearest `LocaleProvider`: the formatter of its locale,
 * with the messages of its language. The messages are the catalogs of ui, with
 * the `catalogs` of each enclosing `LocaleProvider` merged over them. Outside
 * each provider, it gives an English intl, so a component renders its default
 * messages with no provider.
 *
 * ```tsx
 * const intl = useIntl()
 *
 * return <Button>{intl.formatMessage(messages.signIn)}</Button>
 * ```
 *
 * @returns The FormatJS intl of the nearest provider.
 */
export function useIntl(): IntlShape {
	return useIntlContext()
}
