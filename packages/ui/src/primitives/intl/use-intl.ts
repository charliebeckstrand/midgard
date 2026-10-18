'use client'

import { useIntlContext } from './context'
import type { IntlShape } from './intl-define'

/**
 * Reads the intl of the nearest `IntlProvider`, which `LocaleProvider` renders
 * with its locale. Outside each provider, it gives an English intl, so a
 * component renders its default messages with no provider.
 *
 * @internal
 */
export function useIntl(): IntlShape {
	return useIntlContext()
}
