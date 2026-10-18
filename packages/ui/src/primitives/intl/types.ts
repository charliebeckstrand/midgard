// The intl types of ui. A unit outside `primitives/intl` takes them from here,
// because only the primitive imports FormatJS (see the
// `no-formatjs-import-outside-intl` Biome plugin).

import type { MessageValues, TypedMessageDescriptor } from '@formatjs/intl'

export type { IntlShape, MessageDescriptor, TypedMessageDescriptor } from '@formatjs/intl'

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
 *
 * @internal
 */
export type MessageSet<V extends Record<string, MessageValues>> = {
	readonly [K in keyof V]: TypedMessageDescriptor<V[K]>
}
