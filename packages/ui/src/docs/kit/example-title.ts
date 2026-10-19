import type { IntlShape } from 'ui/primitives/intl'

/**
 * The start of the message id of the title of an example. The rest of the id
 * is the file name of the example, such as `docs.title.with-icon`.
 */
export const TITLE_ID = 'docs.title.'

/**
 * The title of the example `id` in the language of the reader. The title comes
 * from the file name, so its message has no descriptor in the source.
 * `pnpm intl` writes one entry for each file name in the docs catalog, and the
 * English title is the default.
 *
 * @param id - The file name of the example, such as `with-icon`.
 * @param title - The English title, such as "With icon".
 */
export function exampleTitle(intl: IntlShape, id: string, title: string): string {
	// A variable, not an inline object: the extraction reads each inline
	// descriptor, and this one has no literal id.
	const descriptor = { id: `${TITLE_ID}${id}`, defaultMessage: title }

	return intl.formatMessage(descriptor)
}
