// The intl types of ui. A unit of ui outside `primitives/intl` takes them from
// here, and an app or a package takes them from `ui/primitives/intl`, because
// only the primitive imports FormatJS (see the `no-formatjs-import-outside-intl`
// Biome plugin).

import type { MessageValues, TypedMessageDescriptor } from '@formatjs/intl'

export type {
	/**
	 * The FormatJS intl of a locale: `formatMessage`, and the number, date, list,
	 * and plural formatters of the locale. {@link useIntl} gives it.
	 */
	IntlShape,
	/** A message: an `id`, an English `defaultMessage`, and a `description`. */
	MessageDescriptor,
	/** A {@link MessageDescriptor} with the types of the values of its message. */
	TypedMessageDescriptor,
} from '@formatjs/intl'

/**
 * The type of an exported set of messages with typed values, from the values
 * of each message by key. An exported set needs the annotation, because its
 * inferred type names a module that the package does not import:
 *
 * ```ts
 * type Values = { moved: { item: string } }
 *
 * export const messages: MessageSet<Values> = defineMessages<Values>({ … })
 * ```
 */
export type MessageSet<V extends Record<string, MessageValues>> = {
	readonly [K in keyof V]: TypedMessageDescriptor<V[K]>
}

/**
 * The translated messages of one language, by message id, such as
 * `{ 'shared.signIn': 'Iniciar sesión' }`.
 */
export type IntlMessages = Readonly<Record<string, string>>

/**
 * A function that loads the {@link IntlMessages} of one language, such as
 * `() => import('./es.json')`. A bundle puts the translation in a chunk of its
 * own, so a page loads only the language that it shows.
 */
export type IntlCatalogLoader = () => Promise<{ readonly default: IntlMessages }>

/**
 * The translated messages of an app or a package, by language subtag: the
 * {@link IntlMessages} of the language, or the {@link IntlCatalogLoader} that
 * loads them. An example is `{ es: () => import('./es.json') }`. English has
 * no entry, because the default message of each descriptor is English.
 * `LocaleProvider` takes it as `catalogs`. A server that renders a page in the
 * locale of the request can give the messages of that language, so the page
 * loads no chunk for them.
 */
export type IntlCatalogs = Readonly<Record<string, IntlMessages | IntlCatalogLoader>>
