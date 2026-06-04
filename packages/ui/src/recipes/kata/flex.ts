import { type Ma, ma } from '../kiso'

/**
 * Flex recipe surface. The component owns its direction / align / justify
 * logic; the one design-token mapping it needs from the recipe layer is the
 * named gap scale. Funnel `ma.gap` (the single source of truth) plus a `gap-0`
 * reset so `Flex` / `Stack` never reach into kiso directly.
 */
export const k = {
	gap: { 0: 'gap-0', ...ma.gap } satisfies Record<Ma | 0, string>,
}
