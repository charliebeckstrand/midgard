import { defineMessages, type IntlShape, type MessageDescriptor } from 'ui/primitives/intl'
import { humanize } from '../kit/humanize.ts'

/**
 * The messages that more than one part of the shell shows: the name of the
 * docs, and the name of each section of the pages.
 */
export const appMessages = defineMessages({
	docs: {
		id: 'docs.app.docs',
		defaultMessage: 'Docs',
		description:
			'The name of the documentation site. It shows in the title of the browser tab, in the header of the home page, and at the top of the sidebar.',
	},
})

// The name of each section of the pages, by the folder of the section in
// `pages/`. The folder stays the key of the section, because the paths and the
// order of the pages use it.
const sectionMessages: Readonly<Record<string, MessageDescriptor>> = defineMessages({
	components: {
		id: 'docs.app.section.components',
		defaultMessage: 'Components',
		description:
			'The name of the section of the sidebar and of the home page that lists the components.',
	},
	modules: {
		id: 'docs.app.section.modules',
		defaultMessage: 'Modules',
		description:
			'The name of the section of the sidebar and of the home page that lists the modules, such as the grid and the chart.',
	},
	primitives: {
		id: 'docs.app.section.primitives',
		defaultMessage: 'Primitives',
		description:
			'The name of the section of the sidebar and of the home page that lists the primitives: the low-level parts that the components use.',
	},
	providers: {
		id: 'docs.app.section.providers',
		defaultMessage: 'Providers',
		description:
			'The name of the section of the sidebar and of the home page that lists the providers: the parts that give settings to the parts under them.',
	},
	structure: {
		id: 'docs.app.section.structure',
		defaultMessage: 'Structure',
		description:
			'The name of the section of the sidebar and of the home page that lists the layout parts, such as a stack or a split.',
	},
})

/**
 * The name of the section of the pages in the folder `section`, in the
 * language of `intl`. A folder with no message reads as its words.
 */
export function sectionLabel(intl: IntlShape, section: string): string {
	const message = sectionMessages[section]

	return message ? intl.formatMessage(message) : humanize(section)
}
