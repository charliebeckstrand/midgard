import { defineMessages, type IntlCatalogs, IntlMessage } from 'ui/primitives/intl'
import { LocaleProvider } from 'ui/providers/locale'
import { Text } from 'ui/text'
import es from './lang/es.json'

// A module with no `'use client'`, such as a React Server Component, cannot
// call `useIntl`. It renders `IntlMessage`, which reads the intl of the
// nearest `LocaleProvider` on the client. `defineMessages` has no
// `'use client'` either, so the module defines its own messages.
const messages = defineMessages({
	empty: {
		id: 'invoices.empty',
		defaultMessage: 'No invoices yet.',
		description: 'The text of the invoice list when the list is empty.',
	},
})

const catalogs: IntlCatalogs = { es }

export default function ServerModule() {
	return (
		<LocaleProvider locale="es" catalogs={catalogs}>
			<Text>
				<IntlMessage message={messages.empty} />
			</Text>
		</LocaleProvider>
	)
}
