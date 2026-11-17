import pages from 'virtual:docs/pages'
import { Fragment } from 'react'
import { CodeBlock } from 'ui/code'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from 'ui/description-list'
import { Heading } from 'ui/heading'
import { defineMessages, IntlMessage, type MessageDescriptor, useIntl } from 'ui/primitives/intl'
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
			'The text at the top of the home page of the docs, above the steps to set up ui. ui is the name of the library.',
	},
	setUp: {
		id: 'docs.home.setUp',
		defaultMessage: 'Set up an app',
		description: 'The heading of the steps on the home page of the docs that add ui to an app.',
	},
	styles: {
		id: 'docs.home.styles',
		defaultMessage:
			'Import the styles of ui in the stylesheet of the app, and add the source of ui to the sources of Tailwind. The dark variant follows the class that AppearanceProvider sets.',
		description:
			'The first step to set up ui, above a code block of CSS. Tailwind is the name of a CSS tool, and AppearanceProvider is the name of a component. Keep both names in English.',
	},
	providers: {
		id: 'docs.home.providers',
		defaultMessage:
			'Put the providers at the root of the app, in this order. UIProvider takes the link component of the router.',
		description:
			'The second step to set up ui, above a code block. UIProvider is the name of a component. Keep it in English.',
	},
	imports: {
		id: 'docs.home.imports',
		defaultMessage: 'Import each part from its own path. ui has no root import.',
		description:
			'The last step to set up ui, above a code block of import lines. ui is the name of the library.',
	},
	sections: {
		id: 'docs.home.sections',
		defaultMessage: 'Sections',
		description:
			'The heading of the list on the home page of the docs that tells what each section of the sidebar holds.',
	},
})

// What each section of the sidebar holds, by the folder of the section. The
// home page lists the sections of the pages, so a new section needs an entry.
const sectionDescriptions: Readonly<Record<string, MessageDescriptor>> = defineMessages({
	components: {
		id: 'docs.home.section.components',
		defaultMessage: 'The controls and the content of a page, such as Button, Dialog, and Table.',
		description:
			'What the Components section of the docs holds. Button, Dialog, and Table are names of components. Keep them in English.',
	},
	modules: {
		id: 'docs.home.section.modules',
		defaultMessage:
			'Large parts that hold their own components and state, such as Grid, Chart, and Form.',
		description:
			'What the Modules section of the docs holds. Grid, Chart, and Form are names of modules. Keep them in English.',
	},
	primitives: {
		id: 'docs.home.section.primitives',
		defaultMessage: 'The low-level parts that the components use.',
		description: 'What the Primitives section of the docs holds.',
	},
	providers: {
		id: 'docs.home.section.providers',
		defaultMessage:
			'The settings that the parts under a provider read: appearance, density, language, and more.',
		description: 'What the Providers section of the docs holds.',
	},
	structure: {
		id: 'docs.home.section.structure',
		defaultMessage: 'The layout units, such as Stack and Columns. Their gap follows the density.',
		description:
			'What the Structure section of the docs holds. Stack and Columns are names of components. Keep them in English.',
	},
})

const STYLES = `@import 'ui/tailwind.css';

@source '../node_modules/ui/src';

@custom-variant dark (&:where(.dark, .dark *));`

const PROVIDERS = `<AppearanceProvider>
  <LocaleProvider locale="en">
    <UIProvider link={Link}>{children}</UIProvider>
  </LocaleProvider>
</AppearanceProvider>`

// The sections in the order of the sidebar.
const sections = groupSections(pages).map(({ section }) => section)

const IMPORTS = `import { Button } from 'ui/button'
import { Grid } from 'ui/grid'
import { Stack } from 'ui/stack'`

/** The root path: the steps to set up ui in an app, and what each section of the docs holds. */
export default function Home() {
	const intl = useIntl()

	return (
		<Stack gap="xl">
			<Text tone="muted">
				<IntlMessage message={messages.intro} />
			</Text>
			<Stack gap="md">
				<Heading level={2}>
					<IntlMessage message={messages.setUp} />
				</Heading>
				<Text>
					<IntlMessage message={messages.styles} />
				</Text>
				<CodeBlock lang="css" code={STYLES} />
				<Text>
					<IntlMessage message={messages.providers} />
				</Text>
				<CodeBlock lang="tsx" code={PROVIDERS} />
				<Text>
					<IntlMessage message={messages.imports} />
				</Text>
				<CodeBlock lang="tsx" code={IMPORTS} />
			</Stack>
			<Stack gap="md">
				<Heading level={2}>
					<IntlMessage message={messages.sections} />
				</Heading>
				<DescriptionList>
					{sections.map((section) => (
						<Fragment key={section}>
							<DescriptionTerm>{sectionLabel(intl, section)}</DescriptionTerm>
							<DescriptionDetails>
								<IntlMessage message={sectionDescriptions[section] as MessageDescriptor} />
							</DescriptionDetails>
						</Fragment>
					))}
				</DescriptionList>
			</Stack>
		</Stack>
	)
}
