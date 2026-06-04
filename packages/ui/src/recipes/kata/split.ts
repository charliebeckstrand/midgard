import { ma } from '../kiso'

/**
 * Split recipe surface. `Split` owns its ratio / direction / align logic; the
 * one design-token mapping it needs is the named gap scale, funnelled from
 * `ma.gap` (the single source of truth) so the component never reaches into
 * kiso directly.
 */
export const k = {
	gap: ma.gap,
}
