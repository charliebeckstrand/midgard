import pages from 'virtual:docs/pages'
import { Flex } from 'ui/flex'
import { Link } from 'ui/link'
import { defineMessages, IntlMessage, useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { sectionLabel } from '../app-messages.ts'
import { groupSections } from '../sidebar.tsx'

const messages = defineMessages({
	intro: {
		id: 'docs.home.intro',
		defaultMessage:
			'Each component, module, structure, provider, and primitive of ui, with a playground, examples, and an API reference.',
		description:
			'The text at the top of the home page of the docs, above the list of the pages. ui is the name of the library.',
	},
})

/** The root path: each page of the docs, by section. */
export default function Home() {
	const intl = useIntl()

	return (
		<Stack gap="lg">
			<Text tone="muted">
				<IntlMessage message={messages.intro} />
			</Text>
			{groupSections(pages).map(({ section, links }) => (
				<Stack key={section} gap="sm">
					<Text tone="muted" className="text-sm uppercase tracking-wide">
						{sectionLabel(intl, section)}
					</Text>
					{/* The list is `contents`, so each link is an item of the row. */}
					<Flex gap="lg" wrap>
						<ul className="contents">
							{links.map((page) => (
								<li key={page.path}>
									<Link href={page.path}>{page.name}</Link>
								</li>
							))}
						</ul>
					</Flex>
				</Stack>
			))}
		</Stack>
	)
}
