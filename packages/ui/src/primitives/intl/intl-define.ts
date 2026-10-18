// The entry of FormatJS for the code of ui outside `primitives/intl`. A unit
// defines its messages next to its code with `defineMessages` from here, and
// takes the intl type from here. Only `primitives/intl` imports `react-intl` and
// `@formatjs/intl`, and the `no-formatjs-import-outside-intl` Biome plugin holds
// that rule. The module has no `'use client'` and imports no client module, so
// a server module and a pure engine can define messages with it.
//
// `pnpm intl` finds a call of `defineMessages` by its name, not by the module it
// comes from, so the extraction reads the calls through this re-export.

import type { MessageValues, TypedMessageDescriptor } from '@formatjs/intl'

export type { MessageDescriptor, TypedMessageDescriptor } from '@formatjs/intl'
export { defineMessage, defineMessages } from '@formatjs/intl'
export type { IntlShape } from 'react-intl'

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
