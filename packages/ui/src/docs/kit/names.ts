import type { IntlShape } from 'ui/primitives/intl'
import { defineMessages } from '../../primitives/intl/intl-messages.ts'
import { humanize } from './humanize.ts'

// The docs show some names from the source as text: the title of an example
// from its file name, the name of a tab from the `TABS` of its page, and the
// label and the options of a field of a playground from the name and the
// values of its prop. Such a name has no descriptor in the source. `pnpm intl`
// writes one catalog entry for each name (`plugin/titles.ts` and
// `plugin/fields.ts`), with the English text as the default. Each function
// here gives the entry in the language of the reader.

/** The file name of the playground of a page or a tab, and the id of its heading. */
export const PLAYGROUND = 'playground'

const messages = defineMessages({
	playground: {
		id: 'docs.example.playground',
		defaultMessage: 'Playground',
		description:
			'The heading of the first example of a page, where the reader changes the props of the component to see the result.',
	},
})

/**
 * The start of the message id of the title of an example. The rest of the id
 * is the file name of the example, such as `docs.title.with-icon`.
 */
export const TITLE_ID = 'docs.title.'

/**
 * The start of the message id of the name of a tab. The rest of the id is the
 * slug of the tab, such as `docs.tab.sorting`.
 */
export const TAB_ID = 'docs.tab.'

/**
 * The start of the message id of the common name of a page, such as
 * `docs.page.date-picker` for "Date picker". The rest of the id is the last
 * part of the path of the page. The page shows its component name, and the
 * search finds the page by its common name too.
 */
export const PAGE_ID = 'docs.page.'

/**
 * The start of the message id of the label of a field of a playground, and of
 * its options. The rest of the id is the name of the prop, such as
 * `docs.prop.placement`, and for an option also the value, such as
 * `docs.prop.placement.bottom-start`.
 */
export const PROP_ID = 'docs.prop.'

/**
 * The English names of the size steps, which `humanize` cannot give from the
 * values, by value.
 */
const SIZE_NAMES: Readonly<Record<string, string>> = {
	xs: 'Extra small',
	sm: 'Small',
	md: 'Medium',
	lg: 'Large',
	xl: 'Extra large',
}

/**
 * The text of the message `id` in the language of `intl`, or `name` when the
 * language is English. In development, a missing message in another language
 * writes an error, so the page smoke test fails on a name that `pnpm intl`
 * did not find.
 */
function formatName(intl: IntlShape, id: string, name: string): string {
	if (
		process.env.NODE_ENV !== 'production' &&
		intl.locale !== intl.defaultLocale &&
		!Object.hasOwn(intl.messages, id)
	) {
		console.error(`docs: the ${intl.locale} catalog has no message ${id}. Run \`pnpm intl\`.`)
	}

	// A variable, not an inline object: the extraction reads each inline
	// descriptor, and this one has no literal id.
	const descriptor = { id, defaultMessage: name }

	return intl.formatMessage(descriptor)
}

/**
 * The title of the example `id` in the language of the reader. The title of a
 * playground is the same on each page.
 *
 * @param id - The id of the heading of the example, such as `with-icon`.
 * @param title - The English title, such as "With icon".
 */
export function exampleTitle(intl: IntlShape, id: string, title: string): string {
	if (id === PLAYGROUND) return intl.formatMessage(messages.playground)

	return formatName(intl, `${TITLE_ID}${id}`, title)
}

/**
 * The common name of the page at `path` in the language of the reader, such
 * as "Selector de fecha" for `/date-picker`.
 *
 * @param path - The path of the page, such as `/date-picker`.
 * @param name - The name of the page, such as `DatePicker`.
 */
export function pageName(intl: IntlShape, path: string, name: string): string {
	return formatName(intl, `${PAGE_ID}${path.split('/').at(-1)}`, humanize(name))
}

/** The path part of a tab: `Server grouping` gives `server-grouping`. */
export function toSlug(tab: string): string {
	return tab.toLowerCase().replaceAll(' ', '-')
}

/**
 * The name of the tab `slug` in the language of the reader.
 *
 * @param slug - The slug of the tab, such as `sorting`.
 * @param name - The English name, such as "Sorting".
 */
export function tabName(intl: IntlShape, slug: string, name: string): string {
	return formatName(intl, `${TAB_ID}${slug}`, name)
}

/**
 * The message id of the label of the field of `prop`, or of the option
 * `value` of the field.
 */
export function toPropId(prop: string, value?: string): string {
	return value === undefined ? `${PROP_ID}${prop}` : `${PROP_ID}${prop}.${value}`
}

/** The English text of the option `value`: `bottom-start` gives "Bottom start", and `xs` gives "Extra small". */
export function formatValue(value: string): string {
	return SIZE_NAMES[value] ?? humanize(value)
}

/** The label of the field of `prop` in the language of the reader, such as "Ubicación" for `placement`. */
export function propLabel(intl: IntlShape, prop: string): string {
	return formatName(intl, toPropId(prop), humanize(prop))
}

/**
 * The label of the option `value` of the field of `prop` in the language of
 * the reader. The id holds the prop, because a language can need another word
 * for the same value of another prop, such as the gender of "none".
 */
export function valueLabel(intl: IntlShape, prop: string, value: string): string {
	return formatName(intl, toPropId(prop, value), formatValue(value))
}
