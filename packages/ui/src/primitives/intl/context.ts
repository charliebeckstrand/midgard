'use client'

import { createContext } from '../../core'
import { englishIntl } from './intl-catalog'
import type { IntlShape } from './types'

/**
 * The context of the intl that `IntlProvider` gives. Outside each provider, it
 * holds an English intl, so a component renders its default messages with no
 * provider. A control reads it through `useIntl`.
 *
 * @internal
 */
export const [IntlContext, useIntlContext] = createContext<IntlShape>('Intl', {
	default: englishIntl,
})
