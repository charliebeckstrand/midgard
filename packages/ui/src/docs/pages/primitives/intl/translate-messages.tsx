import { useState } from 'react'
import { Button } from 'ui/button'
import { Group } from 'ui/group'
import { defineMessages, type IntlCatalogs, useIntl } from 'ui/primitives/intl'
import { LocaleProvider } from 'ui/providers/locale'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import es from './lang/es.json'

// Each message has an id, an English default in ICU syntax, and a description
// for the translator. The type argument gives the values of each message.
// `pnpm intl` reads each call of `defineMessages` into the catalog of the
// package.
const messages = defineMessages<{ greeting: { name: string }; unread: { count: number } }>({
	greeting: {
		id: 'inbox.greeting',
		defaultMessage: 'Welcome back, {name}.',
		description: 'The greeting at the top of the inbox. The value is the first name of the reader.',
	},
	unread: {
		id: 'inbox.unread',
		defaultMessage: '{count, plural, one {# unread message} other {# unread messages}}',
		description: 'The count of the messages that the reader has not opened.',
	},
})

// The translations, by language subtag and then by message id, in a `lang`
// folder. English has no entry, because each default is English. A loader,
// such as the German one, runs when a provider first shows its language, so a
// page in another language loads none of it. The message loader of the build
// precompiles each file. The catalogs are a module constant, so the provider
// keeps one intl for each language.
const catalogs: IntlCatalogs = {
	es,
	de: () => import('./lang/de.json'),
}

// Each button shows the name of its language in that language, so the button
// sets the `lang` of that language.
const languages = [
	{ locale: 'en', name: 'English' },
	{ locale: 'es', name: 'Español' },
	{ locale: 'de', name: 'Deutsch' },
]

// `useIntl` reads the intl of the nearest `LocaleProvider`, and
// `formatMessage` gives the message in its language, with the values. The
// `lang` of the text comes from the intl, not from the state. While a
// translation loads, the provider keeps the old language, so the intl tells
// the language that the text shows.
function Inbox({ count }: { count: number }) {
	const intl = useIntl()

	return (
		<Stack gap="xs" lang={intl.locale}>
			<Text>{intl.formatMessage(messages.greeting, { name: 'Ana' })}</Text>
			<Text tone="muted">{intl.formatMessage(messages.unread, { count })}</Text>
		</Stack>
	)
}

export default function TranslateMessages() {
	const [locale, setLocale] = useState('en')

	const [count, setCount] = useState(1)

	return (
		<Stack gap="md">
			<Group>
				{languages.map((language) => (
					<Button
						key={language.locale}
						lang={language.locale}
						variant={language.locale === locale ? undefined : 'soft'}
						aria-pressed={language.locale === locale}
						onClick={() => setLocale(language.locale)}
					>
						{language.name}
					</Button>
				))}
			</Group>
			<LocaleProvider locale={locale} catalogs={catalogs}>
				<Inbox count={count} />
			</LocaleProvider>
			<div>
				<Button variant="outline" onClick={() => setCount((value) => value + 1)}>
					Add a message
				</Button>
			</div>
		</Stack>
	)
}
