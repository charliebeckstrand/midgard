'use client'

import { useMemo } from 'react'
import { Field, Label } from '../../components/fieldset'
import { intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { useLocaleChoice } from '../locale/context'
import { localeOptions } from '../locale/locale-choice'
import { appearanceMessages } from './appearance-messages'
import { ChoiceListbox } from './choice-listbox'

/**
 * The Language picker of {@link AppearanceSettings}. It offers System and each
 * of the `locales` of the nearest `LocaleProvider`, with the name of each
 * locale in its own language. Give it as a child of `AppearanceSettings`, so
 * that the app sets its position among the other fields.
 *
 * @remarks The picker renders nothing outside a `LocaleProvider` that has
 * `locales`. The name of each language comes from `Intl.DisplayNames`, which
 * is slow on its first use. The field renders only while the dialog is open,
 * so the closed dialog does not read the names.
 */
export function AppearanceLanguageField() {
	const localeChoice = useLocaleChoice()

	const locales = localeChoice?.locales

	const intl = useIntl()

	const systemLabel = intl.formatMessage(intlMessages.system)

	const languages = useMemo(
		() => (locales ? localeOptions(locales, systemLabel) : []),
		[locales, systemLabel],
	)

	if (!localeChoice) return null

	return (
		<Field>
			<Label>{intl.formatMessage(appearanceMessages.language)}</Label>
			<ChoiceListbox
				options={languages}
				value={localeChoice.choice}
				onValueChange={localeChoice.setChoice}
			/>
		</Field>
	)
}
