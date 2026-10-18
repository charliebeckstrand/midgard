'use client'

import { use } from 'react'
import { IntlContext, type IntlShape } from 'react-intl'
import { englishIntl } from './intl-catalog'

/**
 * Reads the intl of the nearest `LocaleProvider`. Outside each provider, it
 * gives an English intl, so a component renders its default messages with no
 * provider. A component of ui calls this hook, not the `useIntl` of
 * `react-intl`, which throws outside a provider.
 *
 * @internal
 */
export function useIntl(): IntlShape {
	return (use(IntlContext) as IntlShape | null) ?? englishIntl
}
