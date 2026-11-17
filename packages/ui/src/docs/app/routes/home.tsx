import pages from 'virtual:docs/pages'
import { useMemo, useState } from 'react'
import { List, ListItem, ListLabel } from 'ui/list'
import { defineMessages, IntlMessage, useIntl } from 'ui/primitives/intl'
import { SearchInput } from 'ui/search-input'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { pageName } from '../../kit/names.ts'
import { sectionLabel } from '../app-messages.ts'
import { matchEntries } from '../search-match.ts'
import { groupSections } from '../sidebar.tsx'

const messages = defineMessages({
	intro: {
		id: 'docs.home.intro',
		defaultMessage:
			'Each component, module, structure, provider, and primitive of ui, with a playground, examples, and an API reference.',
		description:
			'The text at the top of the home page of the docs, above the list of the pages. ui is the name of the library.',
	},
	filter: {
		id: 'docs.home.filter',
		defaultMessage: 'Filter pages',
		description:
			'The placeholder of the field on the home page of the docs that shows only the pages whose name holds the text, and the name of the field.',
	},
	noMatch: {
		id: 'docs.home.noMatch',
		defaultMessage: 'No page matches the filter.',
		description:
			'The text of the home page of the docs when no page matches the text of the filter.',
	},
})

/**
 * The root path: each page of the docs, in a list for each section, under a
 * field that filters the pages.
 */
export default function Home() {
	const intl = useIntl()

	const [query, setQuery] = useState('')

	// The filter matches as the search of the docs does: a page matches its
	// name, its common name in the language of the reader, such as "Botón" for
	// Button, and the name of its section.
	const entries = useMemo(
		() =>
			pages.map((page) => ({
				kind: 'page' as const,
				label: page.name,
				href: page.path,
				context: page.category,
				alias: pageName(intl, page.path, page.name),
				place: sectionLabel(intl, page.category),
			})),
		[intl],
	)

	const sections = useMemo(() => {
		const matches = new Set(matchEntries(entries, query).map((entry) => entry.href))

		return groupSections(pages.filter((page) => matches.has(page.path)))
	}, [entries, query])

	const label = intl.formatMessage(messages.filter)

	return (
		<Stack gap="lg">
			<Text tone="muted">
				<IntlMessage message={messages.intro} />
			</Text>
			<SearchInput aria-label={label} placeholder={label} value={query} onValueChange={setQuery} />
			{sections.length === 0 ? (
				<Text tone="muted">
					<IntlMessage message={messages.noMatch} />
				</Text>
			) : (
				sections.map(({ section, links }) => {
					const name = sectionLabel(intl, section)

					return (
						<Stack key={section} gap="sm">
							<Text tone="muted" className="text-sm uppercase tracking-wide">
								{name}
							</Text>
							<List
								items={links}
								getKey={(page) => page.path}
								aria-label={name}
								className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
							>
								{(page) => (
									<ListItem href={page.path}>
										<ListLabel>{page.name}</ListLabel>
									</ListItem>
								)}
							</List>
						</Stack>
					)
				})
			)}
		</Stack>
	)
}
