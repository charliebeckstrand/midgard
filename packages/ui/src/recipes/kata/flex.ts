import { type Ma, ma } from '../kiso'

/**
 * Flex recipe surface. Exposes the named gap scale (`ma.gap`) plus a `gap-0`
 * reset so `Flex` / `Stack` read gap tokens from here rather than kiso directly.
 */
export const k = {
	gap: { 0: 'gap-0', ...ma.gap } satisfies Record<Ma | 0, string>,
}
